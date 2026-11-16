// Seasonal Sumo — ghosts bump into each other (grown from Seasonal Spirits' soft separation):
// two ghosts on the arena that overlap are moved apart and bounce, the heavier — the team in
// season pushes inSeasonPush harder — moving less; a dashing ghost knocks the one it hits away
// hard; and each remembers the last opponent that touched it, for the fall's credit.

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
  // The team whose season is in season (team index = season index) pushes harder.
  const teamInSeason = SEASONS.indexOf(s.clock.current);
  const inSeason = (g: Ghost): number => (g.team === teamInSeason ? cfg.inSeasonPush : 1);
  for (let i = 0; i < gs.length; i++) {
    for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i];
      const b = gs[j];
      if (a && b) bump(cfg, [a, b], [inSeason(a), inSeason(b)], now);
    }
  }
}

// One pair: `push` holds each one's push factor (its mass).
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
  // Apart: the overlap shared inversely to the push factors.
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
  // A dash knocks the other away, harder from the team in season.
  if (now < a.dashUntilMs) {
    b.vx += nx * cfg.knockSpeed * (ma / mb);
    b.vy += ny * cfg.knockSpeed * (ma / mb);
  }
  if (now < b.dashUntilMs) {
    a.vx -= nx * cfg.knockSpeed * (mb / ma);
    a.vy -= ny * cfg.knockSpeed * (mb / ma);
  }
  // Teammates give no credit: a team cannot score by pushing its own ghost off.
  if (a.team !== b.team) {
    a.lastTouch = { by: b.id, atMs: now };
    b.lastTouch = { by: a.id, atMs: now };
  }
}
