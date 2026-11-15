// Seasonal Spirits — where the field lands on the canvas: the whole field, or a camera on one
// ghost. Every drawing function takes a View and maps field units to pixels through it.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';

export const FIELD = DEFAULT_CONFIG.fieldSize;

export interface View {
  ctx: CanvasRenderingContext2D;
  scale: number; // pixels per field unit
  ox: number; // pixel position of field (0, 0)
  oy: number;
  top: number; // pixels reserved at the top for the season clock
}

// The whole field, centred below the season clock.
export function fitField(ctx: CanvasRenderingContext2D, top: number): View {
  const { width, height } = ctx.canvas;
  const scale = Math.min(width, height - top) / FIELD;
  return {
    ctx,
    scale,
    ox: (width - FIELD * scale) / 2,
    oy: top + (height - top - FIELD * scale) / 2,
    top,
  };
}

export interface Lens {
  span: number; // field units along the shorter side of the screen
  // Pixels the camera may look past the field's bottom edge, so the bottom of the field can
  // rise above controls that sit at the bottom of the screen (touch screens); 0 elsewhere.
  bottomPad: number;
}

// A camera centred on `at` that shows about `lens.span` field units along the shorter side
// and never looks past the field's edge (except `lens.bottomPad` at the bottom).
export function follow(
  ctx: CanvasRenderingContext2D,
  top: number,
  at: { x: number; y: number },
  lens: Lens,
): View {
  const { width, height } = ctx.canvas;
  const scale = Math.max(
    Math.min(width, height - top) / lens.span,
    Math.min(width, height - top) / FIELD,
  );
  const clampCentre = (c: number, pixels: number, past: number): number => {
    const half = pixels / scale / 2;
    return half * 2 >= FIELD + past
      ? (FIELD + past) / 2
      : Math.max(half, Math.min(FIELD + past - half, c));
  };
  const cx = clampCentre(at.x, width, 0);
  const cy = clampCentre(at.y, height - top, lens.bottomPad / scale);
  return { ctx, scale, ox: width / 2 - cx * scale, oy: top + (height - top) / 2 - cy * scale, top };
}

export function sx(v: View, x: number): number {
  return v.ox + x * v.scale;
}

export function sy(v: View, y: number): number {
  return v.oy + y * v.scale;
}

export function circle(v: View, x: number, y: number, radiusPx: number): void {
  v.ctx.beginPath();
  v.ctx.arc(sx(v, x), sy(v, y), radiusPx, 0, Math.PI * 2);
}

// Everything drawn inside `draw` stays below the top bar: no ghost, coin or label under it
// (owner's play test 2026-11-15).
export function belowBar(v: View, draw: () => void): void {
  const { ctx } = v;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, v.top, ctx.canvas.width, ctx.canvas.height - v.top);
  ctx.clip();
  draw();
  ctx.restore();
}

// A screen rectangle in pixels: the visible field, a HUD control, a label.
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// True when the two rectangles overlap or come closer than `gap` pixels.
export function overlaps(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.left < b.right + gap &&
    b.left < a.right + gap &&
    a.top < b.bottom + gap &&
    b.top < a.bottom + gap
  );
}

// The part of the canvas the field is drawn in: below the bar, the whole width.
export function visibleArea(v: View): Rect {
  return { left: 0, top: v.top, right: v.ctx.canvas.width, bottom: v.ctx.canvas.height };
}
