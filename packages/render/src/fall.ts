// Seasonal Sumo — a character falling off the island (Sky Island look, 2026-11-18): it tips over
// the edge, turns head-down with an open "o" mouth, drops and shrinks towards the sea below with
// three white speed streaks and a short "Aaah!" bubble, and lands with a small splash on the sea
// band — all within the match's fall time (fallMs; `t` 0 … 1 from trails.ts).

import { inkWidth } from './character.js';
import { look } from './palette.js';
import { seaTop } from './sky.js';
import { drawSprite } from './sprites.js';
import { pill } from './pill.js';

const TIP = 0.2; // the share of the fall spent tipping over the edge
const SPLASH = 0.85; // from here on the splash shows

// The falling character at its place on screen (x, y px, body radius r px).
export function drawFall(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number; r: number; team: number; left: boolean },
  t: number,
): void {
  const sea = seaTop(ctx.canvas.height);
  const drop = t <= TIP ? 0 : ((t - TIP) / (1 - TIP)) ** 2;
  const y = at.y + (sea - at.y) * drop;
  const r = at.r * (1 - 0.6 * drop);
  const turn = Math.min(1, t / TIP) * Math.PI; // head-down after the tip
  const l = look();
  if (t < SPLASH) {
    ctx.save();
    ctx.translate(at.x, y);
    ctx.rotate(at.left ? -turn : turn);
    drawSprite(ctx, { x: 0, y: 0, r, base: at.r, left: at.left }, at.team, 'falling');
    ctx.restore();
    if (drop > 0) streaks(ctx, at.x, y - r * 1.6, r);
    if (t > 0.08 && t < 0.6)
      pill(ctx, {
        x: at.x + r * 1.6,
        y: y - r * 1.4,
        text: 'Aaah!',
        font: 'bold 12px Fredoka, system-ui, sans-serif',
      });
  }
  if (t >= SPLASH) splash(ctx, { x: at.x, sea, r: at.r }, (t - SPLASH) / (1 - SPLASH));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = l.ink;
}

// Three white streaks above a falling character.
function streaks(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const l = look();
  ctx.lineCap = 'round';
  for (const [colour, width] of [
    [l.ink, 5],
    [l.puff, 2.5],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const dx of [-0.6, 0, 0.6]) {
      ctx.moveTo(x + dx * r, y - Math.abs(dx) * r * 0.4);
      ctx.lineTo(x + dx * r, y - r * 1.4 - Math.abs(dx) * r * 0.4);
    }
    ctx.stroke();
  }
}

// A small white splash on the sea band, `t` 0 … 1 into it.
function splash(
  ctx: CanvasRenderingContext2D,
  { x, sea, r }: { x: number; sea: number; r: number },
  t: number,
): void {
  const l = look();
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = l.puff;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = inkWidth(r) * 0.7;
  ctx.beginPath();
  ctx.ellipse(x, sea + 6, r * (0.8 + t), r * (0.25 + 0.2 * t), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const side of [-1, -0.4, 0.4, 1]) {
    ctx.beginPath();
    ctx.arc(
      x + side * r * (0.6 + t),
      sea - r * (0.6 + t * 0.8) * (1 - Math.abs(side) * 0.3),
      r * 0.18,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
