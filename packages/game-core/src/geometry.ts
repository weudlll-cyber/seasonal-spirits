// Seasonal Spirits — plane geometry of the map: distances, clamping, shrine positions.
// The map is a square 0..fieldSize; the four shrines sit inset from the four corners.

import type { GameConfig } from './config.js';
import type { Team, Vec } from './types.js';

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

export function shrinePositions(cfg: GameConfig): Vec[] {
  const lo = cfg.shrineInset;
  const hi = cfg.fieldSize - cfg.shrineInset;
  return [
    { x: lo, y: lo },
    { x: hi, y: lo },
    { x: hi, y: hi },
    { x: lo, y: hi },
  ];
}

export function shrineOf(shrines: readonly Vec[], team: Team): Vec {
  return shrines[team] ?? { x: 0, y: 0 };
}

// A ghost's radius: larger with every coin it carries, up to a limit (CONCEPT.md §2a: a
// carrier is visible from afar). The server's pickup and the client's drawing both use it.
export function ghostRadius(cfg: GameConfig, carried: number): number {
  return cfg.ghostRadius + Math.min(cfg.ghostGrowthMax, carried * cfg.ghostGrowthPerCoin);
}

// True when the drawn ghost and the drawn coin touch: the pickup rule (2026-11-15).
export function touchesCoin(cfg: GameConfig, ghost: Vec, carried: number, coin: Vec): boolean {
  return distance(ghost, coin) <= ghostRadius(cfg, carried) + cfg.coinRadius;
}
