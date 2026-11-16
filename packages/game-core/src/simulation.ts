// Seasonal Sumo — one full bot match in accelerated time, with its sanity list.
// Used by `pnpm simulate`, the measurements and the tests; pure apart from the work it does.

import { createBot, type Bot } from './bots/human.js';
import type { GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import { seasonsInMatch } from './seasons.js';
import type { Intent, MatchEvent, MatchResult, MatchState, Team } from './types.js';

export const SIM_TICK_MS = 50; // the server's 20 Hz step

export interface SanityCheck {
  name: string;
  ok: boolean;
  detail: string;
}

type HalvingEvent = Extract<MatchEvent, { type: 'halving' }>;

export interface SimulationReport {
  seed: number;
  roster: Roster[];
  halvings: HalvingEvent[];
  falls: { credited: number; uncredited: number };
  result: MatchResult;
  sanity: SanityCheck[];
}

// 8 ghosts per team; slot i is team i mod 4.
export function botRoster(ghosts: number): Roster[] {
  return Array.from({ length: ghosts }, (_, i) => ({ id: i + 1, team: (i % 4) as Team }));
}

// A seat may bring its own bot instead of the default one (the tests do).
export type Seat = Roster & { bot?: Bot };

// The seed of the bot in seat `id` of the match with `seed`; the server uses the same.
export function botSeed(seed: number, id: number): number {
  return seed * 256 + id;
}

export function simulate(
  cfg: GameConfig,
  seed: number,
  roster: Seat[] = botRoster(32),
  afterTick?: (s: Readonly<MatchState>) => void, // tests and measurements watch every tick
): SimulationReport {
  const match = new Match(cfg, seed, roster);
  // Each bot's own random source, from the match's seed and its seat: reproducible runs.
  const bots = new Map<number, Bot>(
    roster.map((r) => [r.id, r.bot ?? createBot(cfg, botSeed(seed, r.id))]),
  );
  const halvings: HalvingEvent[] = [];
  const falls = { credited: 0, uncredited: 0 };
  let badNumber = false;
  let teamCredit = false;
  while (!match.state.ended) {
    const s = match.state;
    const intents = new Map<number, Intent>();
    for (const g of s.ghosts) intents.set(g.id, bots.get(g.id)?.(s, g) ?? { dx: 0, dy: 0 });
    const next = match.tick(SIM_TICK_MS, intents);
    teamCredit = countEvents(next, halvings, falls) || teamCredit;
    badNumber ||= next.ghosts.some((g) => ![g.x, g.y, g.vx, g.vy].every(Number.isFinite));
    afterTick?.(next);
  }
  const result = match.result();
  return {
    seed,
    roster,
    halvings,
    falls,
    result,
    sanity: sanityList(cfg, { halvings, falls, result, badNumber, teamCredit }),
  };
}

// One tick's halvings and falls into the running lists; true when a fall was credited to a
// teammate of the faller.
function countEvents(
  s: Readonly<MatchState>,
  halvings: HalvingEvent[],
  falls: { credited: number; uncredited: number },
): boolean {
  let teamCredit = false;
  const team = (id: number | null): Team | undefined => s.ghosts.find((g) => g.id === id)?.team;
  for (const e of s.events) {
    if (e.type === 'halving') halvings.push(e);
    if (e.type !== 'fall') continue;
    if (e.by === null) falls.uncredited++;
    else falls.credited++;
    teamCredit ||= e.by !== null && team(e.by) === team(e.ghost);
  }
  return teamCredit;
}

function sanityList(
  cfg: GameConfig,
  r: {
    halvings: readonly HalvingEvent[];
    falls: { credited: number; uncredited: number };
    result: MatchResult;
    badNumber: boolean;
    teamCredit: boolean;
  },
): SanityCheck[] {
  const expected = seasonsInMatch(cfg) - 1;
  const knockouts = r.result.teams.reduce((a, b) => a + b, 0);
  const radii = r.halvings.map((h, k) =>
    Math.abs(h.radius - cfg.arenaRadius * Math.SQRT1_2 ** (k + 1)),
  );
  return [
    { name: 'positions and speeds finite', ok: !r.badNumber, detail: 'checked after every tick' },
    {
      name: 'one halving per season turn',
      ok: r.halvings.length === expected,
      detail: `${r.halvings.length} seen, ${expected} expected`,
    },
    {
      name: 'the arena halves its area at each halving',
      ok: radii.every((d) => d < 1e-6),
      detail: r.halvings.map((h) => h.radius.toFixed(1)).join(' → '),
    },
    {
      name: 'every knockout is one credited fall, never by a teammate',
      ok: knockouts === r.falls.credited && !r.teamCredit,
      detail: `${knockouts} knockouts, ${r.falls.credited} credited falls, ${r.falls.uncredited} uncredited`,
    },
  ];
}
