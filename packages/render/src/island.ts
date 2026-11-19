// Seasonal Sumo — the ground the ghosts stand on, as a floating island (Sky Island look,
// 2026-11-18): sumo's arena is its round grass top, the walled modes' square a rounded platform
// (its fence stands on it, fence.ts); under the top a dirt edge and a hanging rock body
// with strata and roots, tapering to three jagged points. Scales with the ground, so the rock
// shrinks with the arena at a halving.

import { look } from './palette.js';
import { ISLAND_DEPTH, sx, sy, type View } from './view.js';

// The ground in field units: a disc of radius `r`, or a square of half side `r`.
export interface Ground {
  x: number;
  y: number;
  r: number;
  square: boolean;
}

const DIRT_PX = 18; // the dirt edge under the top, at most
const RIM = 3; // the top's ink rim
const CORNER = 0.14; // the platform's rounded corner, in its half side

// The rock's underside from the left edge (u -1) to the right (1): how far it hangs below the
// dirt edge, in the rock's full depth — three jagged points.
const PROFILE: readonly (readonly [number, number])[] = [
  [-1, 0],
  [-0.9, 0.18],
  [-0.72, 0.3],
  [-0.6, 0.62],
  [-0.5, 0.4],
  [-0.32, 0.52],
  [-0.18, 0.92],
  [-0.05, 0.58],
  [0.1, 0.68],
  [0.24, 0.5],
  [0.4, 0.8],
  [0.52, 0.45],
  [0.7, 0.3],
  [0.86, 0.14],
  [1, 0],
];
const ROOTS = [-0.7, -0.38, 0.28, 0.62]; // where roots hang from the dirt edge

// The ground on screen: centre, half width and half depth in pixels, and the dirt's height; and
// where no decoration stands (decor.ts), ellipses in pixels.
export interface OnScreen {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  dirt: number;
  square: boolean;
  keepOut?: readonly Ellipse[];
}

// An ellipse on screen: centre and half axes in pixels.
export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export function onScreen(v: View, g: Ground): OnScreen {
  const rx = g.r * v.scale;
  const ry = rx * v.tilt;
  return {
    cx: sx(v, g.x),
    cy: sy(v, g.y),
    rx,
    ry,
    dirt: Math.min(DIRT_PX, ry * 0.4),
    square: g.square,
  };
}

// The ground's outline at centre height `cy` (the top, or shifted down: the dirt), as a path.
export function outline(ctx: CanvasRenderingContext2D, o: OnScreen, cy: number): void {
  ctx.beginPath();
  if (!o.square) {
    ctx.ellipse(o.cx, cy, o.rx, o.ry, 0, 0, Math.PI * 2);
    return;
  }
  const r = o.rx;
  const c = r * CORNER;
  ctx.save();
  ctx.translate(o.cx, cy);
  ctx.scale(1, o.ry / o.rx); // the view's tilt
  ctx.moveTo(-r + c, -r);
  ctx.arcTo(r, -r, r, r, c);
  ctx.arcTo(r, r, -r, r, c);
  ctx.arcTo(-r, r, -r, -r, c);
  ctx.arcTo(-r, -r, r, -r, c);
  ctx.closePath();
  ctx.restore();
}

// How far below the centre the ground's front edge is at `u` (-1 left … 1 right), in pixels.
function front(o: OnScreen, u: number): number {
  return o.square ? o.ry : o.ry * Math.sqrt(Math.max(0, 1 - u * u));
}

function rockPath(ctx: CanvasRenderingContext2D, o: OnScreen): void {
  const depth = o.rx * ISLAND_DEPTH;
  ctx.beginPath();
  for (const [u, d] of PROFILE) {
    ctx.lineTo(o.cx + u * o.rx, o.cy + o.dirt + front(o, u) + depth * d);
  }
  ctx.closePath(); // straight back along the top: hidden under the dirt and the grass
}

function drawRock(ctx: CanvasRenderingContext2D, o: OnScreen): void {
  const l = look();
  rockPath(ctx, o);
  ctx.fillStyle = l.rock;
  ctx.fill();
  ctx.lineWidth = RIM;
  ctx.strokeStyle = l.ink;
  ctx.stroke();
  // Strata: wavy lines following the front, inside the rock.
  ctx.save();
  rockPath(ctx, o);
  ctx.clip();
  ctx.strokeStyle = l.strata;
  ctx.lineWidth = 2;
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    for (let u = -1; u <= 1.001; u += 0.1) {
      const wave = Math.sin(u * 9 + k * 2) * 3;
      ctx.lineTo(
        o.cx + u * o.rx,
        o.cy + o.dirt + front(o, u) + o.rx * ISLAND_DEPTH * 0.18 * k + wave,
      );
    }
    ctx.stroke();
  }
  ctx.restore();
  // Roots hanging from the dirt edge.
  ctx.strokeStyle = l.roots;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const u of ROOTS) {
    const x = o.cx + u * o.rx;
    const y = o.cy + o.dirt + front(o, u) - 2;
    const len = o.rx * (0.1 + 0.05 * Math.abs(u));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + len * 0.3,
      y + len * 0.35,
      x - len * 0.3,
      y + len * 0.65,
      x + len * 0.1,
      y + len,
    );
    ctx.stroke();
  }
}

// The rock, the dirt edge and the grass top with its ink rim.
export function drawGround(v: View, g: Ground): OnScreen {
  const { ctx } = v;
  const l = look();
  const o = onScreen(v, g);
  drawRock(ctx, o);
  // The dirt: the outline shifted down, joined to the top at both sides.
  outline(ctx, o, o.cy + o.dirt);
  ctx.rect(o.cx - o.rx, o.cy, 2 * o.rx, o.dirt);
  ctx.fillStyle = l.dirt;
  ctx.fill();
  ctx.lineWidth = RIM;
  ctx.strokeStyle = l.ink;
  outline(ctx, o, o.cy + o.dirt);
  ctx.stroke();
  outline(ctx, o, o.cy);
  ctx.fillStyle = l.grass;
  ctx.fill();
  ctx.stroke();
  return o;
}
