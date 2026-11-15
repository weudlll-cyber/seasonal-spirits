// Seasonal Spirits — the "Your shrine" arrow at the screen edge in "Near" (owner's play test
// 2026-11-15: players lost their own shrine). Placement is pure and tested; drawing is below.

import { TEXT } from '@seasonal-spirits/render';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface EdgeArrow {
  x: number;
  y: number;
  angle: number; // radians, 0 = pointing right
}

const inside = (r: Rect, p: { x: number; y: number }): boolean =>
  p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

// Null while `target` (screen pixels) is inside `screen`. Otherwise the point `inset` pixels
// inside the edge on the line from the screen's centre to the target, pointing at it; if
// that point falls on `avoid` (the minimap), it moves just below it.
export function edgeArrow(
  screen: Rect,
  target: { x: number; y: number },
  inset: number,
  avoid?: Rect,
): EdgeArrow | null {
  if (inside(screen, target)) return null;
  const cx = (screen.left + screen.right) / 2;
  const cy = (screen.top + screen.bottom) / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const halfW = (screen.right - screen.left) / 2 - inset;
  const halfH = (screen.bottom - screen.top) / 2 - inset;
  const k = Math.min(
    dx === 0 ? Infinity : halfW / Math.abs(dx),
    dy === 0 ? Infinity : halfH / Math.abs(dy),
  );
  const at = { x: cx + dx * k, y: cy + dy * k };
  if (avoid && inside(avoid, at)) at.y = avoid.bottom + inset;
  return { ...at, angle: Math.atan2(dy, dx) };
}

export function drawArrow(ctx: CanvasRenderingContext2D, a: EdgeArrow, colour: string): void {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
  // The label sits on the inner side of the arrow, so it never leaves the screen, on a dark
  // backing so a ghost's name beneath it cannot make it unreadable.
  const text = 'Your shrine';
  const lx = a.x - Math.cos(a.angle) * 46;
  const ly = a.y - Math.sin(a.angle) * 26;
  ctx.font = 'bold 13px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(5, 8, 11, 0.85)';
  ctx.fillRect(lx - w / 2, ly - 10, w, 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.fillText(text, lx, ly);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
