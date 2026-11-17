// Seasonal Sumo — the arena: a disc in the middle of the field. At every halving its area
// halves (radius × 1/√2) and the edge eases in over arenaShrinkMs; a ghost whose centre is
// outside the edge falls. Also where ghosts start and respawn: each team on its own quarter.
// In the walled modes the arena is the disc inside the walls and never halves (no falls).

import { walled, type GameConfig } from './config.js';
import { distance } from './geometry.js';
import type { Arena, Ghost, MatchState, Team, Vec } from './types.js';

export const HALF_AREA = Math.SQRT1_2; // the radius factor that halves a disc's area

export function newArena(cfg: GameConfig): Arena {
  const c = cfg.fieldSize / 2;
  const r = walled(cfg) ? cfg.wallHalf : cfg.arenaRadius;
  return { centre: { x: c, y: c }, radius: r, from: r, target: r, shrinkFromMs: 0 };
}

// The halving: the edge will ease from where it is now to half the area of the last target.
export function halveArena(a: Arena, atMs: number): void {
  a.from = a.radius;
  a.target = a.target * HALF_AREA;
  a.shrinkFromMs = atMs;
}

// The radius the next halving leads to: the dashed ring the clients draw in its countdown.
export function nextRadius(a: Readonly<Arena>): number {
  return a.target * HALF_AREA;
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
function teamAngle(team: Team): number {
  return -0.75 * Math.PI + (team * Math.PI) / 2;
}

const at = (a: Readonly<Arena>, angle: number, r: number): Vec => ({
  x: a.centre.x + Math.cos(angle) * r,
  y: a.centre.y + Math.sin(angle) * r,
});

// The middle of a team's (or its season's) quarter of the walled square: on the diagonal, half
// way to the corner — the hill's zone sits there.
export function quarterCentre(cfg: GameConfig, a: Readonly<Arena>, team: Team): Vec {
  return at(a, teamAngle(team), cfg.wallHalf * Math.SQRT2 * 0.5);
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

// A respawn spot on the team's quarter, inside the arena, as far from every ghost on it as a
// few seeded tries find; `rng` is the match's seeded random source.
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
    const angle = teamAngle(team) + (rng() - 0.5) * (Math.PI / 2);
    const p = at(s.arena, angle, s.arena.radius * (0.25 + 0.5 * rng()));
    const room = Math.min(Infinity, ...onArena.map((g) => distance(g, p)));
    if (room > bestRoom) {
      best = p;
      bestRoom = room;
    }
    if (room > cfg.ghostRadius * 4) break;
  }
  return best;
}
