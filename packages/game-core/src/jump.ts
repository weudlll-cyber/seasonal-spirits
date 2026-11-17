// Seasonal Sumo — the jump (owner's idea, JUMP 2026-11-17): the second action. For jump.airMs a
// ghost is in the air: nothing hits it and it pushes nobody (collisions.ts, and no bomb passes
// either way), it barely steers (airSteer), and it falls only when it lands outside the arena
// (falls.ts). The match starts it (match.ts); the client's prediction steers the own ghost with
// the same airSteer.

import type { GameConfig } from './config.js';
import { clampDirection } from './geometry.js';
import type { Ghost } from './types.js';

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
