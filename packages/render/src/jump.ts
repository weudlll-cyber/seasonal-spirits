// Seasonal Sumo — how a jump looks (JUMP 2026-11-17; NIGHT 2026-11-18: far more visible; Sky
// Island look 2026-11-18): over its time in the air the character follows a smooth arc — up to
// AIR_TOP_SCALE of its size and one ghost diameter up on screen at the top, its label and marks
// with it — while its shadow stays on the ground at its real position, darker and smaller the
// higher it is (every character has the shadow); a short ring spreads on the ground at the
// take-off and the landing; "Dodged!" shows in a pill above a character a dash passed under (the
// server's GHOST_DODGED). One drawing for the player client and the viewer (ghosts.ts calls it).

import { REACH } from './character.js';
import { look } from './palette.js';
import { pill } from './pill.js';
import { shape } from './shape.js';
import { VIEW_TILT, sx, sy, type View } from './view.js';

export const AIR_TOP_SCALE = 1.5; // the body's size at the top of the arc
export const RING_MS = 350; // how long the ground ring spreads at take-off and landing
export const DODGED_MS = 1000; // how long "Dodged!" shows

// The arc at `t` (0 take-off … 1 landing): its height, 0 … 1 … 0, smooth at both ends.
export function arcHeight(t: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
}

// Where a ghost at height `h` is drawn: one ghost diameter up on screen at the top (in field
// units, so divided by the view's tilt that squashes them), and how much larger.
export function lifted(g: { x: number; y: number }, h: number): { x: number; y: number } {
  return { x: g.x, y: g.y - (h * 2 * shape().ghostRadius) / VIEW_TILT };
}

export function airScale(h: number): number {
  return 1 + (AIR_TOP_SCALE - 1) * h;
}

// The soft shadow on the ground under the feet at the ghost's real position, for every character;
// smaller and darker the higher it jumps (`h` 0 on the ground … 1 at the top).
export function drawShadow(v: View, g: { x: number; y: number }, r: number, h: number): void {
  const { ctx } = v;
  ctx.fillStyle = `rgba(20, 14, 40, ${(0.22 + 0.2 * h).toFixed(3)})`;
  ctx.beginPath();
  const size = 1 - 0.35 * h;
  ctx.ellipse(sx(v, g.x), sy(v, g.y) + r, r * 1.05 * size, r * 0.38 * size, 0, 0, 2 * Math.PI);
  ctx.fill();
}

// The ground ring `t` (0 just now … 1 gone) into a take-off or a landing, lying on the ground.
export function drawGroundRing(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  const rx = r * (1.1 + 1.4 * t);
  ctx.globalAlpha = 0.8 * (1 - t);
  ctx.strokeStyle = look().puff;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sx(v, g.x), sy(v, g.y) + r, rx, rx * VIEW_TILT * 0.75, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// "Dodged!" in a pill above a body of radius `r` px at (x, y) field units, rising and fading over
// `t`.
export function drawDodged(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  ctx.globalAlpha = 1 - t * t;
  const y = sy(v, g.y) - r * REACH.top - 16 - 10 * t;
  pill(ctx, {
    x: sx(v, g.x),
    y,
    text: 'Dodged!',
    font: 'bold 13px Fredoka, system-ui, sans-serif',
  });
  ctx.globalAlpha = 1;
}
