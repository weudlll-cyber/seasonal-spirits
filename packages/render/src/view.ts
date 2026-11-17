// Seasonal Sumo — where the field lands on the canvas: a square of it fitted below the bar (the
// client's playing area, the viewer's whole field). Every drawing function takes a View and maps
// field units to pixels through it.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';

export const FIELD = DEFAULT_CONFIG.fieldSize;

export interface View {
  ctx: CanvasRenderingContext2D;
  scale: number; // pixels per field unit
  ox: number; // pixel position of field (0, 0)
  oy: number;
  top: number; // pixels reserved at the top for the season clock
}

// A square of the field the camera fits: its centre and half its side, in field units.
export interface Box {
  x: number;
  y: number;
  half: number;
}

// The whole field, centred below the season clock (the debug viewer).
export function fitField(ctx: CanvasRenderingContext2D, top: number): View {
  return fitBox(ctx, top, { x: FIELD / 2, y: FIELD / 2, half: FIELD / 2 });
}

// What the fitted box keeps away from: controls in the bottom corners (clearArea) and, by
// `marginPx`, the edges.
export interface Room {
  keepOut: readonly Rect[];
  marginPx: number;
}

// `box` as large as it goes into the canvas below the bar, centred in the part `room` leaves.
export function fitBox(
  ctx: CanvasRenderingContext2D,
  top: number,
  box: Box,
  room: Room = { keepOut: [], marginPx: 0 },
): View {
  const { width, height } = ctx.canvas;
  const a = clearArea(width, height, top, room.keepOut);
  const scale = Math.max(1, squareSide(a) - 2 * room.marginPx) / (2 * box.half);
  return {
    ctx,
    scale,
    ox: (a.left + a.right) / 2 - box.x * scale,
    oy: (a.top + a.bottom) / 2 - box.y * scale,
    top,
  };
}

// The part of the canvas below the bar clear of `keepOut` (rectangles at the bottom: the Dash
// button right, the joystick's thumb zone left): everything above the highest of them, or the
// strip between the left ones and the right ones — whichever holds the larger square. A
// portrait phone gets the part above, a landscape phone and a desktop the strip between.
export function clearArea(
  width: number,
  height: number,
  top: number,
  keepOut: readonly Rect[],
): Rect {
  const all = { left: 0, top, right: width, bottom: height };
  if (keepOut.length === 0) return all;
  const above = { ...all, bottom: Math.max(top, Math.min(...keepOut.map((r) => r.top))) };
  const onLeft = (r: Rect): boolean => r.left + r.right < width;
  const between = {
    ...all,
    left: Math.max(0, ...keepOut.filter(onLeft).map((r) => r.right)),
    right: Math.min(width, ...keepOut.filter((r) => !onLeft(r)).map((r) => r.left)),
  };
  return squareSide(between) >= squareSide(above) ? between : above;
}

function squareSide(r: Rect): number {
  return Math.min(r.right - r.left, r.bottom - r.top);
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
