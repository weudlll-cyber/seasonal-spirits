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
import { sx, sy, type View } from './view.js';

export const AIR_TOP_SCALE = 1.5; // the body's size at the top of the arc
export const RING_MS = 350; // how long the ground ring spreads at take-off and landing
export const DODGED_MS = 1000; // how long "Dodged!" shows

// The arc at `t` (0 take-off … 1 landing): its height, 0 … 1 … 0, smooth at both ends.
export function arcHeight(t: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
}

// Where a ghost at height `h` is drawn: one ghost diameter up on screen at the top (in field
// units, so divided by the view's tilt that squashes them), and how much larger.
export function lifted(v: View, g: { x: number; y: number }, h: number): { x: number; y: number } {
  return { x: g.x, y: g.y - (h * 2 * shape().ghostRadius) / v.tilt };
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
  ctx.ellipse(sx(v, g.x), sy(v, g.y) + r, rx, rx * v.tilt * 0.75, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A "Dodged!" pill's size on screen, pixels (its text at 13 px bold, with room).
export const DODGED_BOX = { width: 62, height: 20 };

// Where "Dodged!" stands above a body of radius `r` px at (x, y) field units, `t` into its rise
// (0 … 1): its pill's centre in pixels, kept inside the canvas's sides and below the bar
// (2026-11-19: on a phone a bubble over a character at the field's edge was cut off).
export function dodgedAt(
  v: View,
  g: { x: number; y: number },
  r: number,
  t: number,
): { x: number; y: number } {
  const half = DODGED_BOX.width / 2;
  const x = Math.min(v.ctx.canvas.width - half, Math.max(half, sx(v, g.x)));
  const y = sy(v, g.y) - r * REACH.top - 16 - 10 * t;
  return { x, y: Math.max(v.top + DODGED_BOX.height / 2, y) };
}
const DODGED_LIFTS = 3; // how often a bubble moves up out of another's way before it is left out

// Never two "Dodged!" bubbles over each other (2026-11-19): `at` moved up a bubble's height at a
// time until it is clear of every one in `placed`; null when it stays covered (left out).
export function clearBubble(
  at: { x: number; y: number },
  placed: readonly { x: number; y: number }[],
): { x: number; y: number } | null {
  const hits = (p: { x: number; y: number }, y: number): boolean =>
    Math.abs(p.x - at.x) < DODGED_BOX.width && Math.abs(p.y - y) < DODGED_BOX.height;
  for (let k = 0; k <= DODGED_LIFTS; k++) {
    const y = at.y - k * DODGED_BOX.height;
    if (!placed.some((p) => hits(p, y))) return { x: at.x, y };
  }
  return null;
}

// "Dodged!" in a pill centred on `at` (pixels), fading over `t`.
export function drawDodged(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  t: number,
): void {
  ctx.globalAlpha = 1 - t * t;
  pill(ctx, { ...at, text: 'Dodged!', font: 'bold 13px Fredoka, system-ui, sans-serif' });
  ctx.globalAlpha = 1;
}
