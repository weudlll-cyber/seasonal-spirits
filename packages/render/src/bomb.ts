// Seasonal Sumo — the bomb carrier in "Halving Bomb", in code: a large round black bomb above it
// with a pale rim and a cap, a thick fuse whose length is the share of the time left until the
// bombs go off, a glowing spark at its tip, and the carrier's body pulsing in a hot halo — one
// look at any size tells who carries (NIGHT 2026-11-18, piece 5).

import { sx, sy, type View } from './view.js';

const LIFT = 6; // pixels between the ghost's body and the bomb
const CARRIER_PULSE = 1.12; // the body's largest size while it pulses

// The bomb's radius and the full fuse's length for a ghost of body radius `r` pixels: large
// enough to read on a small phone, larger than the ghost on a desktop.
const bombRadius = (r: number): number => Math.max(9, r * 1.05);
const fuseLength = (r: number): number => Math.max(16, r * 1.5);

// The spark's flicker and the body's pulse quicken as the fuse burns down (1 full … 0).
const beat = (nowMs: number, fuse: number): number =>
  0.5 + 0.5 * Math.sin(nowMs / (40 + 80 * Math.max(0, Math.min(1, fuse))));

// How far above the ghost's centre the drawing reaches: its label keeps clear of it.
export function bombReach(r: number): number {
  return r + LIFT + 2 * bombRadius(r) + fuseLength(r);
}

// The carrier's body radius now, pulsing, and its hot halo drawn behind the body.
export function drawCarrier(
  v: View,
  at: { x: number; y: number; r: number },
  fuse: number,
  nowMs: number,
): number {
  const pulse = beat(nowMs / 3, fuse);
  const r = at.r * (1 + (CARRIER_PULSE - 1) * pulse);
  const { ctx } = v;
  ctx.globalAlpha = 0.25 + 0.35 * pulse;
  ctx.fillStyle = '#ff6b2e';
  ctx.beginPath();
  ctx.arc(sx(v, at.x), sy(v, at.y), r + 4 + 3 * pulse, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  return r;
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
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, b, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  // The cap, and the fuse leaning right out of it, shorter as the time runs out: a dark edge
  // under the rope so it reads on any ground.
  const capX = x + b * 0.45;
  const capY = y - b * 0.85;
  ctx.fillStyle = '#d9dee4';
  ctx.fillRect(capX - 3, capY - 3, 6, 5);
  const len = fuseLength(at.r) * Math.max(0, Math.min(1, fuse));
  const endX = capX + len * 0.7;
  const endY = capY - len * 0.7;
  for (const [colour, width] of [
    ['#0b0b0d', 5],
    ['#e0b77a', 3],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(capX, capY - 2);
    ctx.quadraticCurveTo(capX + len * 0.1, endY, endX, endY);
    ctx.stroke();
  }
  // The spark: a glow and a flickering core at the fuse's tip.
  const flicker = beat(nowMs, fuse);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.arc(endX, endY, 6 + 3 * flicker, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = flicker > 0.5 ? '#fff3b0' : '#ff6b2e';
  ctx.beginPath();
  ctx.arc(endX, endY, 3 + 2 * flicker, 0, 2 * Math.PI);
  ctx.fill();
}
