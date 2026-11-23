// Seasonal Sumo — a dash's wind-up drawn (game-core windup.ts): a white glow and a line on the
// ground in the dash's direction, so every player sees it coming.

import { look } from './palette.js';
import { sx, sy, type View } from './view.js';

const LINE = 3.5; // the line's length in body radii

// `angle`: the dash's direction in radians on the field (GhostState.windUp); `r` the body radius
// in pixels. The line lies on the ground: its depth squashed by the view's tilt.
export function drawWindUp(v: View, at: { x: number; y: number; r: number }, angle: number): void {
  const { ctx } = v;
  const l = look();
  const x = sx(v, at.x);
  const y = sy(v, at.y);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = l.puff;
  ctx.beginPath();
  ctx.arc(x, y, at.r + 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle) * v.tilt;
  ctx.lineCap = 'round';
  for (const [colour, width] of [
    [l.ink, 7],
    [l.puff, 3.5],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x + dx * at.r, y + at.r * 0.6 + dy * at.r);
    ctx.lineTo(x + dx * at.r * LINE, y + at.r * 0.6 + dy * at.r * LINE);
    ctx.stroke();
  }
}
