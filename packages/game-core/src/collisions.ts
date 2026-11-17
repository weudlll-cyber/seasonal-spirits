// Seasonal Sumo — ghosts bump into each other (grown from Seasonal Spirits' soft separation):
// two ghosts on the arena that overlap are moved apart and bounce, the heavier — the team in
// season pushes inSeasonPush harder — moving less; a dashing ghost throws the one it hits off at
// knockSpeed, and a crowd behind the thrown one gives way instead of stopping it; and each
// remembers the last opponent that touched it, for the fall's credit.

import type { GameConfig } from './config.js';
import { inAir } from './jump.js';
import { SEASONS } from './seasons.js';
import type { Ghost, MatchState } from './types.js';

const GOLDEN_ANGLE = 2.399963229728653; // parts ghosts that share one point evenly

// Takes part in collisions: on the arena, not protected after a respawn and not in the air (a
// jump: nothing hits it, it pushes nobody — JUMP 2026-11-17).
function solid(g: Ghost, nowMs: number): boolean {
  return g.phase === 'in' && nowMs >= g.protectedUntilMs && !inAir(g, nowMs);
}

// Every overlapping pair once, in id order (the ghosts are sorted, so the same seed gives the
// same match).
export function collideGhosts(cfg: GameConfig, s: MatchState): void {
  const now = s.elapsedMs;
  // The team whose season is in season (team index = season index) pushes harder; a thrown
  // ghost counts knockWeight heavier, so the ghosts it flies into give way (TUNE 2026-11-17: a
  // crowd cancelled the dash hit). The weight moves them apart; only the season makes a throw
  // harder (FIX 2026-11-17-3: with the weight in it, a thrown ghost that dashed threw at
  // 10 × knockSpeed, 160 units a tick, and flew through everything).
  const teamInSeason = SEASONS.indexOf(s.clock.current);
  const bodies = s.ghosts
    .filter((g) => solid(g, now))
    .map((g): Body => {
      const season = g.team === teamInSeason ? cfg.inSeasonPush : 1;
      return { g, season, weight: season * (now < g.knockedUntilMs ? cfg.knockWeight : 1) };
    });
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      if (a && b) bump(cfg, a, b, now);
    }
  }
}

// A ghost in a collision: its weight (apart and bounce) and its season's push factor (a throw).
interface Body {
  g: Ghost;
  weight: number;
  season: number;
}

function bump(cfg: GameConfig, pa: Body, pb: Body, now: number): void {
  const { g: a, weight: ma } = pa;
  const { g: b, weight: mb } = pb;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = 2 * cfg.ghostRadius;
  // Most pairs are far apart: no square root for them (this runs every sub-step).
  if (dx * dx + dy * dy >= reach * reach) return;
  const d = Math.hypot(dx, dy);
  const angle = (a.id + b.id) * GOLDEN_ANGLE;
  const nx = d > 0 ? dx / d : Math.cos(angle);
  const ny = d > 0 ? dy / d : Math.sin(angle);
  // Apart: the overlap shared inversely to the weights.
  const overlap = reach - d;
  const total = ma + mb;
  a.x -= nx * overlap * (mb / total);
  a.y -= ny * overlap * (mb / total);
  b.x += nx * overlap * (ma / total);
  b.y += ny * overlap * (ma / total);
  // Bounce: an impulse along the normal while they move towards each other.
  const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (closing < 0) {
    const j = (-(1 + cfg.restitution) * closing) / (1 / ma + 1 / mb);
    a.vx -= (j / ma) * nx;
    a.vy -= (j / ma) * ny;
    b.vx += (j / mb) * nx;
    b.vy += (j / mb) * ny;
  }
  // A dash throws the other off, harder from the team in season.
  const until = now + cfg.dashMs;
  const ratio = pa.season / pb.season;
  if (now < a.dashUntilMs) throwOff(b, { x: nx, y: ny }, ratio * cfg.knockSpeed, until);
  if (now < b.dashUntilMs) throwOff(a, { x: -nx, y: -ny }, cfg.knockSpeed / ratio, until);
  // Teammates give no credit: a team cannot score by pushing its own ghost off.
  if (a.team !== b.team) {
    a.lastTouch = { by: b.id, atMs: now };
    b.lastTouch = { by: a.id, atMs: now };
  }
}

// The hit ghost moves away along `n` at `speed` at least: set, not added, so a dash that touches
// it on several ticks throws it as far as one touch, and the throw is knockSpeed / friction long
// whatever the bounce gave. It counts as thrown until `untilMs` (dashMs on).
function throwOff(g: Ghost, n: { x: number; y: number }, speed: number, untilMs: number): void {
  const along = g.vx * n.x + g.vy * n.y;
  if (along < speed) {
    g.vx += (speed - along) * n.x;
    g.vy += (speed - along) * n.y;
  }
  g.knockedUntilMs = untilMs;
}
