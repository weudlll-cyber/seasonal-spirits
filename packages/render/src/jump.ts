// Seasonal Sumo — how a jump looks (JUMP 2026-11-17): in the air a soft shadow on the ground
// below the ghost and the ghost drawn larger; on landing a small puff — a pale ring that grows
// and fades. One drawing for the player client and the viewer (ghosts.ts calls it).

import { circle, sx, sy, type View } from './view.js';

export const AIR_SCALE = 1.2; // the body's radius in the air
export const PUFF_MS = 350; // how long the landing puff shows

// The shadow on the ground, below and a little to the right of the body (light from above
// left), far enough down to show under the own ghost's ring too.
export function drawShadow(v: View, g: { x: number; y: number }, r: number): void {
  const { ctx } = v;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(sx(v, g.x) + r * 0.4, sy(v, g.y) + r * 1.5, r * 0.95, r * 0.4, 0, 0, 2 * Math.PI);
  ctx.fill();
}

// The puff `t` (0 just landed … 1 gone) into the landing.
export function drawPuff(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  ctx.strokeStyle = `rgba(230, 237, 243, ${(0.6 * (1 - t)).toFixed(3)})`;
  ctx.lineWidth = 3;
  circle(v, g.x, g.y, r * (1.1 + 0.8 * t));
  ctx.stroke();
}
