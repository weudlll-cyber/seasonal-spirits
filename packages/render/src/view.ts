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

// A camera centred on `at` that shows about `span` field units along the shorter side and
// never looks past the field's edge.
export function follow(
  ctx: CanvasRenderingContext2D,
  top: number,
  at: { x: number; y: number },
  span: number,
): View {
  const { width, height } = ctx.canvas;
  const scale = Math.max(
    Math.min(width, height - top) / span,
    Math.min(width, height - top) / FIELD,
  );
  const clampCentre = (c: number, pixels: number): number => {
    const half = pixels / scale / 2;
    return half * 2 >= FIELD ? FIELD / 2 : Math.max(half, Math.min(FIELD - half, c));
  };
  const cx = clampCentre(at.x, width);
  const cy = clampCentre(at.y, height - top);
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
