// Seasonal Sumo — where the field lands on the canvas, seen from three quarters above (Sky
// Island look, 2026-11-18): a square of it fitted below the bar (the client's playing area, the
// viewer's whole field), its depth squashed by the view's tilt, with room under it for the
// island's rock body. Every drawing function takes a View and maps field units to pixels through
// it; input directions stay screen = field directions.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';

export const FIELD = DEFAULT_CONFIG.fieldSize;
// Screen y = field y × the view's tilt (around the fitted box's centre): the field seen from above
// at a slant. VIEW_TILT is the usual one; a tall clear area above the controls (a portrait phone)
// turns the view steeper, up to MAX_TILT, so the playing surface fills the height between the
// band and the controls (NIGHT 2026-11-19: the island filled only the top third).
export const VIEW_TILT = 0.55;
export const MAX_TILT = 0.9;
// The island's rock body under the ground's front edge, in the ground's radius: the camera keeps
// room for it below the playing area (island.ts draws it).
export const ISLAND_DEPTH = 0.45;

export interface View {
  ctx: CanvasRenderingContext2D;
  scale: number; // pixels per field unit
  tilt: number; // screen y per field y (VIEW_TILT … MAX_TILT)
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

// What the fitted box keeps away from: controls in the bottom corners and, by `marginPx`, the
// edges.
export interface Room {
  keepOut: readonly Rect[];
  marginPx: number;
}

// Where the box's centre lands, half its side in pixels and the tilt it is seen at.
interface Fit {
  cx: number;
  cy: number;
  perHalf: number;
  tilt: number;
}

// `box` as large as it goes into the canvas below the bar: the larger of two fits (`between`,
// `above`). Equal sizes keep the usual slant.
export function fitBox(
  ctx: CanvasRenderingContext2D,
  top: number,
  box: Box,
  room: Room = { keepOut: [], marginPx: 0 },
): View {
  const { width, height } = ctx.canvas;
  const a = between(width, height, top, room);
  const b = room.keepOut.length > 0 ? above(width, height, top, room) : a;
  const fit = b.perHalf > a.perHalf ? b : a;
  const scale = fit.perHalf / box.half;
  return {
    ctx,
    scale,
    tilt: fit.tilt,
    ox: fit.cx - box.x * scale,
    oy: fit.cy - box.y * scale * fit.tilt,
    top,
  };
}

// The whole island — its squashed ground and the rock under it — at the usual slant in the
// strip between the controls on the left and those on the right (a desktop, a landscape phone;
// without controls the whole canvas below the bar).
function between(width: number, height: number, top: number, room: Room): Fit {
  const onLeft = (r: Rect): boolean => r.left + r.right < width;
  const left = Math.max(0, ...room.keepOut.filter(onLeft).map((r) => r.right));
  const right = Math.min(width, ...room.keepOut.filter((r) => !onLeft(r)).map((r) => r.left));
  const m = 2 * room.marginPx;
  const tall = 2 * VIEW_TILT + ISLAND_DEPTH; // the island's height per unit of half its side
  const perHalf = Math.max(1, Math.min(right - left - m, ((height - top - m) * 2) / tall) / 2);
  // The ground's centre sits above the middle by half the rock's depth.
  return {
    cx: (left + right) / 2,
    cy: (top + height) / 2 - (ISLAND_DEPTH * perHalf) / 2,
    perHalf,
    tilt: VIEW_TILT,
  };
}

// The playing surface alone above the highest control, across the whole width (a portrait
// phone): the controls may cover the sky and the rock body under it, never the surface. When the
// width limits it, the view turns steeper (up to MAX_TILT) to fill the height; the rock still
// ends above the canvas's bottom edge.
function above(width: number, height: number, top: number, room: Room): Fit {
  const bottom = Math.max(top, Math.min(...room.keepOut.map((r) => r.top)));
  const mp = room.marginPx;
  const h = bottom - top - 2 * mp; // the surface's room
  const all = height - top - 2 * mp; // the surface's and the rock's
  const perHalf = Math.max(
    1,
    Math.min((width - 2 * mp) / 2, h / (2 * VIEW_TILT), all / (2 * VIEW_TILT + ISLAND_DEPTH)),
  );
  const tilt = Math.max(
    VIEW_TILT,
    Math.min(MAX_TILT, h / (2 * perHalf), (all / perHalf - ISLAND_DEPTH) / 2),
  );
  // The surface centred in its room, lifted if the rock would reach past the bottom edge.
  const cy = Math.min((top + bottom) / 2, height - mp - perHalf * (tilt + ISLAND_DEPTH));
  return { cx: width / 2, cy, perHalf, tilt };
}

export function sx(v: View, x: number): number {
  return v.ox + x * v.scale;
}

export function sy(v: View, y: number): number {
  return v.oy + y * v.scale * v.tilt;
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
  v.ctx.ellipse(sx(v, x), sy(v, y), r * v.scale, r * v.scale * v.tilt, 0, 0, Math.PI * 2);
}

// Back to front: what stands further down the field is drawn later, over what stands behind it;
// things on one y keep their order (the sort is stable: a fence's posts over their rails).
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
