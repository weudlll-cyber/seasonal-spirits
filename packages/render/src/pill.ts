// Seasonal Sumo — the white rounded pill with an ink outline (Sky Island look, 2026-11-18): the
// one shape for the ghosts' labels, the clock's box and the short bubbles ("Aaah!", "Dodged!").

import { look } from './palette.js';

export const PILL_PAD = 3; // px of pill on each side of its text: narrow, so a crowd's labels fit

// A rounded box as the current path, its corners as round as it allows.
export function roundBox(
  ctx: CanvasRenderingContext2D,
  box: { left: number; top: number; width: number; height: number },
  radius = box.height / 2,
): void {
  const { left, top, width, height } = box;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.arcTo(left + width, top, left + width, top + height, r);
  ctx.arcTo(left + width, top + height, left, top + height, r);
  ctx.arcTo(left, top + height, left, top, r);
  ctx.arcTo(left, top, left + width, top, r);
  ctx.closePath();
}

// A pill (or, with a `radius`, a rounded box) filled with the panel colour and outlined in ink.
export function pillBox(
  ctx: CanvasRenderingContext2D,
  box: { left: number; top: number; width: number; height: number },
  radius?: number,
): void {
  const l = look();
  roundBox(ctx, box, radius);
  ctx.fillStyle = l.panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = l.ink;
  ctx.stroke();
}

// `text` in a pill centred on (x, y) px.
export function pill(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; text: string; font: string },
): void {
  ctx.font = p.font;
  const width = ctx.measureText(p.text).width + 2 * PILL_PAD;
  const height = 18;
  pillBox(ctx, { left: p.x - width / 2, top: p.y - height / 2, width, height });
  ctx.fillStyle = look().panelText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.text, p.x, p.y + 1);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
