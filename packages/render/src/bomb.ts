// Seasonal Sumo — the ticking bomb drawn above a carrier in "Halving Bomb", in code: a round
// black bomb with a pale rim and a cap, a fuse whose length is the share of the time left
// until the bombs go off, and a flickering spark at its end.

import { sx, sy, type View } from './view.js';

const LIFT = 8; // pixels between the ghost's body and the bomb
const FUSE_PX = 14; // the full fuse's length

// The bomb's radius for a ghost of body radius `r` pixels: readable even on a small phone.
const bombRadius = (r: number): number => Math.max(6, r * 0.75);

// How far above the ghost's centre the drawing reaches: its label keeps clear of it.
export function bombReach(r: number): number {
  return r + LIFT + 2 * bombRadius(r) + FUSE_PX;
}

// `fuse`: 1 full … 0 about to go off; `nowMs` drives the spark's flicker.
export function drawBomb(
  v: View,
  at: { x: number; y: number; r: number },
  fuse: number,
  nowMs: number,
): void {
  const { ctx } = v;
  const b = bombRadius(at.r);
  const x = sx(v, at.x);
  const y = sy(v, at.y) - at.r - LIFT - b;
  ctx.fillStyle = '#0b0b0d';
  ctx.strokeStyle = '#d9dee4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, b, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  // The cap, and the fuse leaning right out of it, shorter as the time runs out.
  const capX = x + b * 0.45;
  const capY = y - b * 0.85;
  ctx.fillStyle = '#d9dee4';
  ctx.fillRect(capX - 2.5, capY - 2.5, 5, 4);
  const len = FUSE_PX * Math.max(0, Math.min(1, fuse));
  const endX = capX + len * 0.7;
  const endY = capY - len * 0.7;
  ctx.strokeStyle = '#c8a46e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(capX, capY - 2);
  ctx.quadraticCurveTo(capX + len * 0.1, endY, endX, endY);
  ctx.stroke();
  // The spark flickers faster as the fuse burns down.
  const flicker = 0.5 + 0.5 * Math.sin(nowMs / (40 + 80 * fuse));
  ctx.fillStyle = flicker > 0.5 ? '#ffd54a' : '#ff6b2e';
  ctx.beginPath();
  ctx.arc(endX, endY, 2.5 + 1.5 * flicker, 0, 2 * Math.PI);
  ctx.fill();
}
