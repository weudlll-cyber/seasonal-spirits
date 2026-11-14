// Seasonal Spirits — one full bot match in accelerated time, with its sanity list.
// Used by `pnpm simulate` and by the tests; pure apart from the work it does.

import { createBot, STRATEGIES, type Strategy } from './bots/strategies.js';
import type { Bot } from './bots/common.js';
import type { GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import { SEASONS, totalCount } from './seasons.js';
import type { Intent, MatchEvent, MatchResult, MatchState, Team } from './types.js';

export const SIM_TICK_MS = 50; // the server's 20 Hz step

export interface SanityCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SimulationReport {
  seed: number;
  roster: (Roster & { strategy: Strategy })[];
  seasons: Extract<MatchEvent, { type: 'season' }>[];
  halving: Extract<MatchEvent, { type: 'halving' }> | null;
  result: MatchResult;
  sanity: SanityCheck[];
}

// 8 ghosts per team; strategies cycle so each team has 3 patient, 3 cautious, 2 hunters.
export function botRoster(ghosts: number): (Roster & { strategy: Strategy })[] {
  return Array.from({ length: ghosts }, (_, i) => ({
    id: i + 1,
    team: (i % 4) as Team,
    strategy: STRATEGIES[Math.floor(i / 4) % STRATEGIES.length] ?? 'patient',
  }));
}

export function simulate(cfg: GameConfig, seed: number, ghosts = 32): SimulationReport {
  const roster = botRoster(ghosts);
  const match = new Match(cfg, seed, roster);
  const bots = new Map<number, Bot>(roster.map((r) => [r.id, createBot(cfg, r.strategy)]));
  const report: SimulationReport = {
    seed,
    roster,
    seasons: [],
    halving: null,
    result: match.result(),
    sanity: [],
  };
  let negativeSeen = false;
  let halvings = 0;
  while (!match.state.ended) {
    const s = match.state;
    const intents = new Map<number, Intent>();
    for (const g of s.ghosts) intents.set(g.id, bots.get(g.id)?.(s, g) ?? { dx: 0, dy: 0 });
    const next = match.tick(SIM_TICK_MS, intents);
    for (const e of next.events) {
      if (e.type === 'season') report.seasons.push(e);
      if (e.type === 'halving') {
        report.halving = e;
        halvings++;
      }
    }
    negativeSeen ||= hasNegativeCount(next);
  }
  report.result = match.result();
  report.sanity = sanityList(match.state, report.halving, { negativeSeen, halvings });
  return report;
}

export function hasNegativeCount(s: Readonly<MatchState>): boolean {
  const counts = [s.pool, ...s.ghosts.map((g) => g.carried)];
  return counts.some((c) => SEASONS.some((season) => c[season] < 0));
}

function sanityList(
  s: Readonly<MatchState>,
  halving: SimulationReport['halving'],
  seen: { negativeSeen: boolean; halvings: number },
): SanityCheck[] {
  const poolLeft = totalCount(s.pool);
  return [
    { name: 'no negative counts', ok: !seen.negativeSeen, detail: 'checked after every tick' },
    { name: 'exactly one halving', ok: seen.halvings === 1, detail: `${seen.halvings} seen` },
    {
      name: 'conservation at the halving',
      ok: halving !== null && halving.carriedBefore === halving.carriedAfter + halving.pooled,
      detail: halving
        ? `${halving.carriedBefore} carried = ${halving.carriedAfter} kept + ${halving.pooled} pooled`
        : 'no halving',
    },
    {
      name: 'pool fully accounted',
      ok: s.stats.pooled === s.stats.poolTaken + poolLeft,
      detail: `${s.stats.pooled} pooled = ${s.stats.poolTaken} taken + ${poolLeft} left`,
    },
  ];
}
