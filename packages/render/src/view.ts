// Seasonal Sumo — where the field lands on the canvas, seen from three quarters above (Sky
// Island look, 2026-11-18): a square of it fitted below the bar (the client's playing area, the
// viewer's whole field), its depth squashed by VIEW_TILT, with room under it for the island's
// rock body. Every drawing function takes a View and maps field units to pixels through it;
// input directions stay screen = field directions.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';

export const FIELD = DEFAULT_CONFIG.fieldSize;
// Screen y = field y × VIEW_TILT (around the fitted box's centre): the field seen from above at
// a slant. Every field → screen helper below uses it.
export const VIEW_TILT = 0.55;
// The island's rock body under the ground's front edge, in the ground's radius: the camera keeps
// room for it below the playing area (island.ts draws it).
export const ISLAND_DEPTH = 0.45;
// The fitted box's height on screen per unit of its half side: the squashed ground and the rock.
const BOX_HEIGHT = 2 * VIEW_TILT + ISLAND_DEPTH;

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

// `box` — its squashed ground and the rock under it — as large as it goes into the canvas below
// the bar, centred in the part `room` leaves.
export function fitBox(
  ctx: CanvasRenderingContext2D,
  top: number,
  box: Box,
  room: Room = { keepOut: [], marginPx: 0 },
): View {
  const { width, height } = ctx.canvas;
  const a = clearArea(width, height, top, room.keepOut);
  const m = 2 * room.marginPx;
  const perHalf = Math.max(
    1,
    Math.min(a.right - a.left - m, ((a.bottom - a.top - m) * 2) / BOX_HEIGHT) / 2,
  );
  const scale = perHalf / box.half;
  // The ground's centre sits above the middle by half the rock's depth.
  const middle = (a.top + a.bottom) / 2 - (ISLAND_DEPTH * perHalf) / 2;
  return {
    ctx,
    scale,
    ox: (a.left + a.right) / 2 - box.x * scale,
    oy: middle - box.y * scale * VIEW_TILT,
    top,
  };
}

// The part of the canvas below the bar clear of `keepOut` (rectangles at the bottom: the Dash
// button right, the joystick's thumb zone left): everything above the highest of them, or the
// strip between the left ones and the right ones — whichever holds the larger box (fitBox's
// shape). A portrait phone gets the part above, a landscape phone and a desktop the strip between.
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
  return room(between) >= room(above) ? between : above;
}

// How large a box fitBox puts into `r`: half its side in pixels.
function room(r: Rect): number {
  return Math.min(r.right - r.left, ((r.bottom - r.top) * 2) / BOX_HEIGHT) / 2;
}

export function sx(v: View, x: number): number {
  return v.ox + x * v.scale;
}

export function sy(v: View, y: number): number {
  return v.oy + y * v.scale * VIEW_TILT;
}

// A circle standing upright at (x, y) field units: a body, a ring round it (radius in pixels).
export function circle(v: View, x: number, y: number, radiusPx: number): void {
  v.ctx.beginPath();
  v.ctx.arc(sx(v, x), sy(v, y), radiusPx, 0, Math.PI * 2);
}

// A circle lying on the ground (radius in field units): squashed by the view's tilt. Starts a
// new path; stroke widths stay unsquashed.
export function groundCircle(v: View, x: number, y: number, r: number): void {
  v.ctx.beginPath();
  v.ctx.ellipse(sx(v, x), sy(v, y), r * v.scale, r * v.scale * VIEW_TILT, 0, 0, Math.PI * 2);
}

// Back to front: what stands further down the field is drawn later, over what stands behind it.
export function byDepth<T extends { y: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.y - b.y);
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
