// Seasonal Sumo — one full bot match of any mode in accelerated time, with its sanity list.
// Used by `pnpm simulate`, the measurements and the tests; pure apart from the work it does.

import { wallsAfter } from './arena.js';
import { createBot, type Bot } from './bots/human.js';
import type { GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import { bombCount } from './modes/bomb.js';
import type { Season } from './seasons.js';
import type { Intent, MatchResult, MatchState, Team } from './types.js';

export const SIM_TICK_MS = 50; // the server's 20 Hz step

export interface SanityCheck {
  name: string;
  ok: boolean;
  detail: string;
}

// A halving as seen right after it: the size of what halves — sumo's arena (its target), the
// hill's zone — or null in bomb.
export interface HalvingNote {
  atMs: number;
  season: Season;
  size: number | null;
}

export interface SimulationReport {
  seed: number;
  roster: Roster[];
  halvings: HalvingNote[];
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
  const halvings: HalvingNote[] = [];
  const falls = { credited: 0, uncredited: 0 };
  let badNumber = false;
  let teamCredit = false;
  let badBombs = false;
  const bombs = cfg.mode === 'bomb' ? bombCount(cfg, roster.length) : 0;
  while (!match.state.ended) {
    const s = match.state;
    const intents = new Map<number, Intent>();
    for (const g of s.ghosts) intents.set(g.id, bots.get(g.id)?.(s, g) ?? { dx: 0, dy: 0 });
    const next = match.tick(SIM_TICK_MS, intents);
    teamCredit = countEvents(next, halvings, falls) || teamCredit;
    badNumber ||= next.ghosts.some((g) => ![g.x, g.y, g.vx, g.vy].every(Number.isFinite));
    badBombs ||= new Set(next.bombs.map((b) => b.carrier)).size !== bombs;
    afterTick?.(next);
  }
  const result = match.result();
  return {
    seed,
    roster,
    halvings,
    falls,
    result,
    sanity: sanityList(cfg, {
      halvings,
      turns: match.state.clock.index,
      falls,
      result,
      badNumber,
      teamCredit,
      badBombs,
    }),
  };
}

// One tick's halvings and falls into the running lists; true when a fall was credited to a
// teammate of the faller.
function countEvents(
  s: Readonly<MatchState>,
  halvings: HalvingNote[],
  falls: { credited: number; uncredited: number },
): boolean {
  let teamCredit = false;
  const team = (id: number | null): Team | undefined => s.ghosts.find((g) => g.id === id)?.team;
  for (const e of s.events) {
    if (e.type === 'halving') halvings.push({ atMs: e.atMs, season: e.season, size: sizeOf(s) });
    if (e.type !== 'fall') continue;
    if (e.by === null) falls.uncredited++;
    else falls.credited++;
    teamCredit ||= e.by !== null && team(e.by) === team(e.ghost);
  }
  return teamCredit;
}

function sizeOf(s: Readonly<MatchState>): number | null {
  if (s.mode === 'sumo') return s.arena.target;
  return s.zone?.r ?? null;
}

interface Seen {
  halvings: readonly HalvingNote[];
  // Season turns up to the end: all of them, or fewer when lives ran out first (standing.ts).
  turns: number;
  falls: { credited: number; uncredited: number };
  result: MatchResult;
  badNumber: boolean;
  teamCredit: boolean;
  badBombs: boolean;
}

function sanityList(cfg: GameConfig, r: Seen): SanityCheck[] {
  const expected = r.turns;
  return [
    { name: 'positions and speeds finite', ok: !r.badNumber, detail: 'checked after every tick' },
    {
      name: 'one halving per season turn',
      ok: r.halvings.length === expected,
      detail: `${r.halvings.length} seen, ${expected} expected`,
    },
    ...modeChecks(cfg, r),
  ];
}

// The arena's or the zone's radius after each of `n` halvings: × the shrink setting; the zone
// never below hill.smallest and never past its quarter of the walls as they close in (hill.ts).
function halvedSizes(cfg: GameConfig, n: number): number[] {
  const sumo = cfg.mode === 'sumo';
  let size = sumo ? cfg.arenaRadius : cfg.hill.zoneRadius;
  let half = cfg.wallHalf;
  return Array.from({ length: n }, () => {
    if (sumo) return (size *= cfg.sumo.shrink);
    half = wallsAfter(cfg, half);
    size = Math.min(half / 2, Math.max(cfg.hill.smallest, size * cfg.hill.shrink));
    return size;
  });
}

// What only one mode promises.
function modeChecks(cfg: GameConfig, r: Seen): SanityCheck[] {
  const fell = r.falls.credited + r.falls.uncredited;
  if (cfg.mode === 'bomb') {
    return [
      { name: 'nobody falls inside the walls', ok: fell === 0, detail: `${fell} falls` },
      {
        name: `always one bomb per ${String(cfg.bomb.playersPerBomb)} players, each with its own carrier`,
        ok: !r.badBombs,
        detail: 'checked after every tick',
      },
    ];
  }
  const sumo = cfg.mode === 'sumo';
  const sizes = halvedSizes(cfg, r.halvings.length);
  const off = r.halvings.map((h, k) => Math.abs((h.size ?? 0) - (sizes[k] ?? 0)));
  const halves = {
    name: `the ${sumo ? 'arena' : 'zone'} shrinks by its setting at each halving`,
    ok: off.every((d) => d < 1e-6),
    detail: r.halvings.map((h) => (h.size ?? 0).toFixed(1)).join(' → '),
  };
  if (cfg.mode === 'hill') {
    return [
      halves,
      { name: 'nobody falls inside the walls', ok: fell === 0, detail: `${fell} falls` },
    ];
  }
  const knockouts = r.result.teams.reduce((a, b) => a + b, 0);
  return [
    halves,
    {
      name: 'every knockout is one credited fall, never by a teammate',
      ok: knockouts === r.falls.credited && !r.teamCredit,
      detail: `${knockouts} knockouts, ${r.falls.credited} credited falls, ${r.falls.uncredited} uncredited`,
    },
  ];
}
