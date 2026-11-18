// Seasonal Sumo — a dash's wind-up drawn (game-core windup.ts, the owner's option): a white glow
// round the ghost and a line from its body in the dash's direction, so every player sees the
// dash coming and where it goes, and can jump or step aside.

import { sx, sy, type View } from './view.js';

const LINE = 3.5; // the line's length in body radii

// `angle`: the dash's direction in radians (GhostState.windUp); `r` the body radius in pixels.
export function drawWindUp(v: View, at: { x: number; y: number; r: number }, angle: number): void {
  const { ctx } = v;
  const x = sx(v, at.x);
  const y = sy(v, at.y);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, at.r + 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + dx * at.r, y + dy * at.r);
  ctx.lineTo(x + dx * at.r * LINE, y + dy * at.r * LINE);
  ctx.stroke();
}
