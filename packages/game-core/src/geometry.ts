// Seasonal Sumo — plane geometry and one step of movement with momentum: distances, clamping,
// a direction clamped to length 1, and stepGhost — the one movement rule the server's tick and
// the client's prediction of the own ghost both use, so they cannot drift apart. The walls of
// hill and bomb are part of it.

import { walled, type GameConfig } from './config.js';
import type { Vec } from './types.js';

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Direction with magnitude at most 1; anything not finite counts as standing still.
export function clampDirection(dx: number, dy: number): Vec {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const mag = Math.hypot(dx, dy);
  return mag > 1 ? { x: dx / mag, y: dy / mag } : { x: dx, y: dy };
}

// Where a ghost's centre may go: the whole field in sumo (the arena's edge is a fall, not a
// wall), inside the walls in hill and bomb.
export function fieldBounds(cfg: GameConfig): { lo: number; hi: number } {
  if (!walled(cfg)) return { lo: 0, hi: cfg.fieldSize };
  const c = cfg.fieldSize / 2;
  return { lo: c - cfg.wallHalf + cfg.ghostRadius, hi: c + cfg.wallHalf - cfg.ghostRadius };
}

// One axis against the bounds: a ghost that runs into a wall stops there and loses the speed
// into it, keeping the speed along it.
function wall(p: number, v: number, b: { lo: number; hi: number }): [number, number] {
  if (p < b.lo) return [b.lo, Math.max(0, v)];
  if (p > b.hi) return [b.hi, Math.min(0, v)];
  return [p, v];
}

export interface Motion {
  x: number;
  y: number;
  vx: number; // units/s
  vy: number;
}

// One step: accelerate towards the held direction — but only while the speed along it is
// below maxSpeed, so running never exceeds it while a dash or a knock may, and then slows —,
// lose `friction` of the speed per second (exponential, so the step size does not matter),
// move, and stay inside the bounds (fieldBounds).
export function stepGhost(
  cfg: GameConfig,
  m: Motion,
  dir: { dx: number; dy: number },
  dtMs: number,
): Motion {
  const dt = dtMs / 1000;
  const d = clampDirection(dir.dx, dir.dy);
  let { vx, vy } = m;
  const along = vx * d.x + vy * d.y;
  const room = Math.max(0, cfg.maxSpeed * Math.hypot(d.x, d.y) - along);
  const push = Math.min(cfg.acceleration * dt, room);
  vx += d.x * push;
  vy += d.y * push;
  const keep = Math.exp(-cfg.friction * dt);
  vx *= keep;
  vy *= keep;
  const b = fieldBounds(cfg);
  const [x, wx] = wall(m.x + vx * dt, vx, b);
  const [y, wy] = wall(m.y + vy * dt, vy, b);
  return { x, y, vx: wx, vy: wy };
}

// The velocity a dash starts with: dashSpeed towards the held direction, or along the current
// motion when no direction is held; standing still and holding nothing, no dash.
export function dashVelocity(
  cfg: GameConfig,
  m: Motion,
  dir: { dx: number; dy: number },
): Vec | null {
  const d = clampDirection(dir.dx, dir.dy);
  const len = Math.hypot(d.x, d.y);
  const speed = Math.hypot(m.vx, m.vy);
  if (len > 0) return { x: (d.x / len) * cfg.dashSpeed, y: (d.y / len) * cfg.dashSpeed };
  if (speed > 0) return { x: (m.vx / speed) * cfg.dashSpeed, y: (m.vy / speed) * cfg.dashSpeed };
  return null;
}
