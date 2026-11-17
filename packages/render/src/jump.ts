// Seasonal Sumo — how a jump looks (JUMP 2026-11-17; NIGHT 2026-11-18: far more visible): over
// its time in the air the ghost follows a smooth arc — up to AIR_TOP_SCALE of its size and one
// ghost diameter up on screen at the top, its label and marks with it — over a shadow on the
// ground at its real position, darker and smaller the higher it is; a short ring spreads on the
// ground at the take-off and the landing; "Dodged!" shows above a ghost a dash passed under (the
// server's GHOST_DODGED). One drawing for the player client and the viewer (ghosts.ts calls it).

import { TEXT } from './palette.js';
import { shape } from './shape.js';
import { circle, sx, sy, type View } from './view.js';

export const AIR_TOP_SCALE = 1.5; // the body's size at the top of the arc
export const RING_MS = 350; // how long the ground ring spreads at take-off and landing
export const DODGED_MS = 1000; // how long "Dodged!" shows

// The arc at `t` (0 take-off … 1 landing): its height, 0 … 1 … 0, smooth at both ends.
export function arcHeight(t: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
}

// Where a ghost at height `h` is drawn: one ghost diameter up at the top (field units), and how
// much larger.
export function lifted(g: { x: number; y: number }, h: number): { x: number; y: number } {
  return { x: g.x, y: g.y - h * 2 * shape().ghostRadius };
}

export function airScale(h: number): number {
  return 1 + (AIR_TOP_SCALE - 1) * h;
}

// The shadow on the ground at the ghost's real position: smaller and darker the higher it is.
export function drawShadow(v: View, g: { x: number; y: number }, r: number, h: number): void {
  const { ctx } = v;
  ctx.fillStyle = `rgba(0, 0, 0, ${(0.35 + 0.3 * h).toFixed(3)})`;
  ctx.beginPath();
  const size = 1 - 0.35 * h;
  ctx.ellipse(sx(v, g.x), sy(v, g.y) + r * 0.3, r * size, r * 0.45 * size, 0, 0, 2 * Math.PI);
  ctx.fill();
}

// The ground ring `t` (0 just now … 1 gone) into a take-off or a landing.
export function drawGroundRing(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  ctx.strokeStyle = `rgba(230, 237, 243, ${(0.7 * (1 - t)).toFixed(3)})`;
  ctx.lineWidth = 3;
  circle(v, g.x, g.y, r * (1 + 1.4 * t));
  ctx.stroke();
}

// "Dodged!" above a body of radius `r` px at (x, y) field units, rising and fading over `t`.
export function drawDodged(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  ctx.globalAlpha = 1 - t * t;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#05080b';
  const y = sy(v, g.y) - r - 22 - 10 * t;
  ctx.strokeText('Dodged!', sx(v, g.x), y);
  ctx.fillStyle = TEXT;
  ctx.fillText('Dodged!', sx(v, g.x), y);
  ctx.globalAlpha = 1;
}
