// Seasonal Sumo — the jump, the second action: for jump.airMs nothing hits the ghost and it pushes
// nobody, it barely steers (airSteer, shared with the client's prediction), it falls only when it
// lands outside; a rival's dash under it is a dodge, once per jump.

import type { GameConfig } from './config.js';
import { clampDirection } from './geometry.js';
import { distance } from './geometry.js';
import type { Ghost, MatchState } from './types.js';

export function inAir(g: Readonly<Ghost>, nowMs: number): boolean {
  return nowMs < g.airUntilMs;
}

// A jump starts only with the switch on, on the arena, on the ground and after the cooldown.
export function canJump(cfg: GameConfig, g: Readonly<Ghost>, nowMs: number): boolean {
  return cfg.jump.enabled && g.phase === 'in' && !inAir(g, nowMs) && nowMs >= g.jumpReadyMs;
}

// In the air the held direction steers at jump.steer of its strength: the direction stays
// almost as it was at the take-off (moveOnce's top speed and push scale with it).
type Steer = { dx: number; dy: number };
export function airSteer(cfg: GameConfig, dir: Steer): Steer {
  const d = clampDirection(dir.dx, dir.dy);
  return { dx: d.x * cfg.jump.steer, dy: d.y * cfg.jump.steer };
}

// After the contacts of a sub-step: a ghost in the air that a dashing rival on the ground
// overlaps has dodged that dash — one 'dodge' event per jump (Ghost.dodged).
export function noteDodges(cfg: GameConfig, s: MatchState): void {
  const now = s.elapsedMs;
  const reach = 2 * cfg.ghostRadius;
  for (const g of s.ghosts) {
    if (g.dodged || g.phase !== 'in' || !inAir(g, now)) continue;
    const by = s.ghosts.find(
      (d) =>
        d.team !== g.team &&
        d.phase === 'in' &&
        now < d.dashUntilMs &&
        !inAir(d, now) &&
        distance(d, g) < reach,
    );
    if (!by) continue;
    g.dodged = true;
    s.events.push({ type: 'dodge', ghost: g.id, by: by.id });
  }
}
