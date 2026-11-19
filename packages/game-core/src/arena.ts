// Seasonal Sumo — the arena: a disc in the middle of the field. At every halving its radius
// shrinks (× sumo.shrink, 0.71 by default: half the area) and the edge eases in over arenaShrinkMs; a ghost whose centre is
// outside the edge falls. Also where ghosts start and respawn: each team on its own quarter.
// In the walled modes the arena is the disc inside the walls and never halves (no falls).

import { walled, type GameConfig } from './config.js';
import { distance } from './geometry.js';
import type { Arena, Ghost, MatchState, Team, Vec } from './types.js';

export function newArena(cfg: GameConfig): Arena {
  const c = cfg.fieldSize / 2;
  const r = walled(cfg) ? cfg.wallHalf : cfg.arenaRadius;
  return { centre: { x: c, y: c }, radius: r, from: r, target: r, shrinkFromMs: 0, carry: false };
}

// The halving: the edge will ease from where it is now to the last target × sumo.shrink.
export function halveArena(cfg: GameConfig, a: Arena, atMs: number): void {
  scaleArena(a, cfg.sumo.shrink, atMs, false);
}

// The edge eases from where it is now to the last target times `factor`: the halving (the ghosts
// stay put), and the owner's live tuning of the starting size (Match.rescaleArena: `carry`, the
// ghosts move with the edge — followEdge).
export function scaleArena(a: Arena, factor: number, atMs: number, carry: boolean): void {
  a.from = a.radius;
  a.target = a.target * factor;
  a.shrinkFromMs = atMs;
  a.carry = carry;
}

// After updateArena: while the edge carries them, every ghost on the arena moves by the same
// share as the edge did since `before` (its radius then), towards or away from the centre — so
// the arena-size slider throws nobody off (FIX 2026-11-17-3).
export function followEdge(s: MatchState, before: number): void {
  const a = s.arena;
  if (!a.carry || a.radius === before || before <= 0) return;
  const k = a.radius / before;
  for (const g of s.ghosts) {
    if (g.phase !== 'in') continue;
    g.x = a.centre.x + (g.x - a.centre.x) * k;
    g.y = a.centre.y + (g.y - a.centre.y) * k;
  }
}

// The radius the next halving leads to: the dashed ring the clients draw in its countdown.
export function nextRadius(cfg: GameConfig, a: Readonly<Arena>): number {
  return a.target * cfg.sumo.shrink;
}

// The edge at `nowMs`: eased in and out between `from` and `target` (slow, fast, slow).
export function updateArena(cfg: GameConfig, a: Arena, nowMs: number): void {
  const t = Math.min(1, Math.max(0, (nowMs - a.shrinkFromMs) / cfg.arenaShrinkMs));
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  a.radius = a.from + (a.target - a.from) * eased;
}

export function outside(a: Readonly<Arena>, p: Vec): boolean {
  return distance(p, a.centre) > a.radius;
}

// The middle of a team's quarter, as an angle: Spring top left, Summer top right, Autumn
// bottom right, Winter bottom left — the corners its shrine had in Seasonal Spirits.
export function teamAngle(team: Team): number {
  return -0.75 * Math.PI + (team * Math.PI) / 2;
}

const at = (a: Readonly<Arena>, angle: number, r: number): Vec => ({
  x: a.centre.x + Math.cos(angle) * r,
  y: a.centre.y + Math.sin(angle) * r,
});

// The middle of a team's (or its season's) quarter of a walled square around `centre` (half its
// side `half`): on the diagonal, half way to the corner — the hill's zone sits there; the client
// keeps its decoration off it (render field.ts).
export function quarterCentre(centre: Vec, half: number, team: Team): Vec {
  const angle = teamAngle(team);
  const r = half * Math.SQRT2 * 0.5;
  return { x: centre.x + Math.cos(angle) * r, y: centre.y + Math.sin(angle) * r };
}

// The start: each team's ghosts spread over its quarter on a ring at startSpread of the
// radius; `slot` places a ghost among its teammates (`index` of `of`).
export function startSpot(
  cfg: GameConfig,
  a: Readonly<Arena>,
  team: Team,
  slot: { index: number; of: number },
): Vec {
  const { index, of } = slot;
  const spread = (Math.PI / 2) * 0.8; // keep clear of the neighbouring quarter's ring
  const angle = teamAngle(team) - spread / 2 + (spread * (index + 0.5)) / Math.max(1, of);
  return at(a, angle, a.radius * cfg.startSpread);
}

const SPAWN_TRIES = 12;

// Where a team's ghosts come back: its quarter (around teamAngle, a quarter turn wide), from
// cfg.respawnBand's inner to its outer share of the radius. The client draws it faintly for its
// player while out (FIX 2026-11-17-3).
export const QUARTER = Math.PI / 2;

// A respawn spot in the team's respawn band, as far from every ghost on the arena as a few
// seeded tries find; `rng` is the match's seeded random source.
export function respawnSpot(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  team: Team,
  rng: () => number,
): Vec {
  let best: Vec = at(s.arena, teamAngle(team), s.arena.radius * 0.5);
  let bestRoom = -1;
  const onArena = s.ghosts.filter((g: Ghost) => g.phase === 'in');
  for (let i = 0; i < SPAWN_TRIES; i++) {
    const { inner, outer } = cfg.respawnBand;
    const angle = teamAngle(team) + (rng() - 0.5) * QUARTER;
    const p = at(s.arena, angle, s.arena.radius * (inner + (outer - inner) * rng()));
    const room = Math.min(Infinity, ...onArena.map((g) => distance(g, p)));
    if (room > bestRoom) {
      best = p;
      bestRoom = room;
    }
    if (room > cfg.ghostRadius * 4) break;
  }
  return best;
}
