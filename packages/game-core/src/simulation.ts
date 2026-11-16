// Seasonal Spirits — one full bot match in accelerated time, with its sanity list.
// Used by `pnpm simulate` and by the tests; pure apart from the work it does.

import { createBot, STRATEGIES, type Strategy } from './bots/strategies.js';
import type { Bot } from './bots/common.js';
import type { GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import { SEASONS, seasonsInMatch, totalCount } from './seasons.js';
import type { Intent, MatchEvent, MatchResult, MatchState, Team } from './types.js';

export const SIM_TICK_MS = 50; // the server's 20 Hz step

export interface SanityCheck {
  name: string;
  ok: boolean;
  detail: string;
}

type HalvingEvent = Extract<MatchEvent, { type: 'halving' }>;

// One halving with the coins carried at the end of the tick before it.
export interface HalvingRecord {
  event: HalvingEvent;
  carriedBefore: number;
}

export interface SimulationReport {
  seed: number;
  roster: (Roster & { strategy: Strategy })[];
  halvings: HalvingRecord[];
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

// A seat may bring its own bot instead of its strategy's: the human stand-in of session
// 2026-11-16-HUMAN (human/standin.ts), measured, never part of the balance pool.
export type Seat = Roster & { strategy: Strategy; bot?: Bot };

export function simulate(
  cfg: GameConfig,
  seed: number,
  roster: Seat[] = botRoster(32),
  afterTick?: (s: Readonly<MatchState>) => void, // tests watch every tick through it
): SimulationReport {
  const match = new Match(cfg, seed, roster);
  const bots = new Map<number, Bot>(roster.map((r) => [r.id, r.bot ?? createBot(cfg, r.strategy)]));
  const halvings: HalvingRecord[] = [];
  let negativeSeen = false;
  while (!match.state.ended) {
    const s = match.state;
    const carriedBefore = carriedTotal(s);
    const intents = new Map<number, Intent>();
    for (const g of s.ghosts) intents.set(g.id, bots.get(g.id)?.(s, g) ?? { dx: 0, dy: 0 });
    const next = match.tick(SIM_TICK_MS, intents);
    for (const e of next.events)
      if (e.type === 'halving') halvings.push({ event: e, carriedBefore });
    negativeSeen ||= hasNegativeCount(next);
    afterTick?.(next);
  }
  return {
    seed,
    roster,
    halvings,
    result: match.result(),
    sanity: sanityList(cfg, match.state, halvings, negativeSeen),
  };
}

function carriedTotal(s: Readonly<MatchState>): number {
  return s.ghosts.reduce((n, g) => n + totalCount(g.carried), 0);
}

export function hasNegativeCount(s: Readonly<MatchState>): boolean {
  return s.ghosts.some((g) => SEASONS.some((season) => g.carried[season] < 0));
}

function sanityList(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  halvings: readonly HalvingRecord[],
  negativeSeen: boolean,
): SanityCheck[] {
  const expected = seasonsInMatch(cfg) - 1;
  const broken = halvings.filter((h) => h.event.carried !== h.carriedBefore);
  const { spawned, pickedUp, cleared } = s.stats;
  return [
    { name: 'no negative counts', ok: !negativeSeen, detail: 'checked after every tick' },
    {
      name: 'one halving per season turn',
      ok: halvings.length === expected,
      detail: `${halvings.length} seen, ${expected} expected`,
    },
    {
      name: 'carried coins conserved across each halving',
      ok: broken.length === 0,
      detail: halvings.map((h) => `${h.carriedBefore} → ${h.event.carried}`).join(', '),
    },
    {
      name: 'field coins accounted',
      ok: spawned === pickedUp + cleared + s.coins.length,
      detail: `${spawned} spawned = ${pickedUp} picked up + ${cleared} gone at halvings + ${s.coins.length} left`,
    },
  ];
}
