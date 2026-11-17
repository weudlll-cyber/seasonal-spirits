// Seasonal Sumo — ghosts bump into each other (grown from Seasonal Spirits' soft separation):
// two ghosts on the arena that overlap are moved apart and bounce, the heavier — the team in
// season pushes inSeasonPush harder — moving less; a dashing ghost throws the one it hits off at
// knockSpeed, and a crowd behind the thrown one gives way instead of stopping it; and each
// remembers the last opponent that touched it, for the fall's credit.

import type { GameConfig } from './config.js';
import { SEASONS } from './seasons.js';
import type { Ghost, MatchState } from './types.js';

const GOLDEN_ANGLE = 2.399963229728653; // parts ghosts that share one point evenly

// Takes part in collisions: on the arena and not protected after a respawn.
function solid(g: Ghost, nowMs: number): boolean {
  return g.phase === 'in' && nowMs >= g.protectedUntilMs;
}

// Every overlapping pair once, in id order (the ghosts are sorted, so the same seed gives the
// same match).
export function collideGhosts(cfg: GameConfig, s: MatchState): void {
  const now = s.elapsedMs;
  const gs = s.ghosts.filter((g) => solid(g, now));
  // The team whose season is in season (team index = season index) pushes harder; a thrown
  // ghost counts knockWeight heavier, so the ghosts it flies into give way (TUNE 2026-11-17: a
  // crowd cancelled the dash hit).
  const teamInSeason = SEASONS.indexOf(s.clock.current);
  const weight = (g: Ghost): number =>
    (g.team === teamInSeason ? cfg.inSeasonPush : 1) *
    (now < g.knockedUntilMs ? cfg.knockWeight : 1);
  for (let i = 0; i < gs.length; i++) {
    for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i];
      const b = gs[j];
      if (a && b) bump(cfg, [a, b], [weight(a), weight(b)], now);
    }
  }
}

// One pair: `push` holds each one's weight.
function bump(cfg: GameConfig, pair: [Ghost, Ghost], push: [number, number], now: number): void {
  const [a, b] = pair;
  const [ma, mb] = push;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const reach = 2 * cfg.ghostRadius;
  if (d >= reach) return;
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
  if (now < a.dashUntilMs) throwOff(b, { x: nx, y: ny }, (ma / mb) * cfg.knockSpeed, until);
  if (now < b.dashUntilMs) throwOff(a, { x: -nx, y: -ny }, (mb / ma) * cfg.knockSpeed, until);
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
