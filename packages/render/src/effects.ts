// Seasonal Sumo — the characters' short effects: landing dust and the dash hit's white star, fewer
// on a phone; when they play is moments.ts.

import { inkWidth } from './character.js';
import { look } from './palette.js';
import { sx, sy, type View } from './view.js';

// A phone-sized canvas gets fewer puffs.
const puffs = (v: View): number => (v.ctx.canvas.width < 600 ? 2 : 4);

// Small dust puffs spreading from the feet of a body of radius `r` px at (x, y) field units, `t`
// 0 … 1 into them.
export function drawDust(v: View, g: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  const l = look();
  const n = puffs(v);
  ctx.globalAlpha = 0.85 * (1 - t);
  ctx.fillStyle = l.puff;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = inkWidth(r) * 0.6;
  for (let i = 0; i < n; i++) {
    const side = (i % 2 ? 1 : -1) * (1 + Math.floor(i / 2) * 0.6);
    ctx.beginPath();
    ctx.arc(
      sx(v, g.x) + side * r * (0.7 + 0.9 * t),
      sy(v, g.y) + r * (1 - 0.3 * t),
      r * (0.28 - 0.08 * Math.floor(i / 2)) * (1 - 0.4 * t),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// A white eight-pointed star with an ink edge at (x, y) field units, growing and fading over `t`.
export function drawStar(v: View, at: { x: number; y: number }, r: number, t: number): void {
  const { ctx } = v;
  const l = look();
  const x = sx(v, at.x);
  const y = sy(v, at.y);
  const outer = r * (0.7 + 0.9 * t);
  ctx.globalAlpha = 1 - t * t;
  ctx.fillStyle = l.puff;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = inkWidth(r) * 0.8;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 + t;
    const d = k % 2 ? outer * 0.42 : outer;
    ctx.lineTo(x + Math.cos(a) * d, y - r * 0.4 + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
}
