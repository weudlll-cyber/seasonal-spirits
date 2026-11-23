// Seasonal Sumo — Halving Bomb's "no return" mark: a pill with a crossed-out U-turn over a ghost
// that just passed a bomb, for exactly the lock (GHOST_NO_RETURN, game-core bomb.ts returnLocked).

import { bombReach } from './bomb.js';
import { REACH } from './character.js';
import { look } from './palette.js';
import { pillBox } from './pill.js';
import { sx, sy, type View } from './view.js';

const LIFT = 3; // pixels between what is below it and the pill
const CROSS = '#d6334a';

// The pill's height for a ghost of body radius `r` pixels: readable on a phone, not huge.
const badgeHeight = (r: number): number => Math.max(14, Math.min(24, r * 1.1));

// What the mark stands on: the hat, or the ghost's own bomb.
const below = (r: number, carrier: boolean): number => (carrier ? bombReach(r) : r * REACH.top);

// How far above the body's centre the mark reaches: its label keeps clear of it (reach.ts).
export function noReturnReach(r: number, carrier: boolean): number {
  return below(r, carrier) + LIFT + badgeHeight(r);
}

export function drawNoReturn(
  v: View,
  at: { x: number; y: number; r: number },
  carrier: boolean,
): void {
  const { ctx } = v;
  const h = badgeHeight(at.r);
  const w = h * 1.6;
  const x = sx(v, at.x);
  const top = sy(v, at.y) - noReturnReach(at.r, carrier);
  pillBox(ctx, { left: x - w / 2, top, width: w, height: h });
  const cy = top + h / 2;
  const k = h * 0.26; // the arrow's half width
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, h * 0.11);
  // The U-turn: up the right, over the top, down the left to the arrow's head.
  ctx.strokeStyle = look().ink;
  ctx.beginPath();
  ctx.moveTo(x + k, cy + 0.7 * k);
  ctx.lineTo(x + k, cy);
  ctx.arc(x, cy, k, 0, Math.PI, true);
  ctx.lineTo(x - k, cy + 0.7 * k);
  ctx.moveTo(x - 1.5 * k, cy + 0.2 * k);
  ctx.lineTo(x - k, cy + 0.75 * k);
  ctx.lineTo(x - 0.5 * k, cy + 0.2 * k);
  ctx.stroke();
  // Crossed out.
  ctx.strokeStyle = CROSS;
  ctx.beginPath();
  ctx.moveTo(x - 1.6 * k, cy + 1.2 * k);
  ctx.lineTo(x + 1.6 * k, cy - 1.2 * k);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}
