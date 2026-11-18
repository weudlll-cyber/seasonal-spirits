// Seasonal Sumo — the dash's wind-up (owner's option, NIGHT 2026-11-18 piece 6; dashWindUpMs, off
// by default): a pressed dash first holds the ghost for the wind-up, its direction fixed at the
// press and shown to everyone (a glow and a line), then goes. A rival who sees it in time can
// jump or step aside; the core enforces it for players and bots alike.

import type { GameConfig } from './config.js';
import type { Ghost } from './types.js';

export function windingUp(g: Readonly<Ghost>, nowMs: number): boolean {
  return nowMs < g.windUntilMs;
}

// The press: the dash's velocity is kept for the release, the ghost stops where it is. The
// cooldown runs from the press (match.ts act), so pressing again does not restart it.
export function windUp(
  cfg: GameConfig,
  g: Ghost,
  v: { x: number; y: number },
  nowMs: number,
): void {
  Object.assign(g, {
    windUntilMs: nowMs + cfg.dashWindUpMs,
    windVx: v.x,
    windVy: v.y,
    vx: 0,
    vy: 0,
  });
}

// The release, at the first tick on or after the wind-up's end: the stored dash, or nothing when
// the ghost has meanwhile fallen or jumped (a dash needs the arena and the ground).
export function released(
  g: Ghost,
  nowMs: number,
  grounded: boolean,
): { x: number; y: number } | null {
  if (g.windUntilMs === 0 || nowMs < g.windUntilMs) return null;
  const v = { x: g.windVx, y: g.windVy };
  Object.assign(g, { windUntilMs: 0, windVx: 0, windVy: 0 });
  return g.phase === 'in' && grounded ? v : null;
}

// The direction of a wind-up as an angle (radians), for the wire and the drawing; null: none.
export function windAngle(g: Readonly<Ghost>, nowMs: number): number | null {
  return windingUp(g, nowMs) ? Math.atan2(g.windVy, g.windVx) : null;
}
