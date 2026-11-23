// Seasonal Sumo — the zoom cap: at 600 px or more a body never exceeds 6 % of the shorter side
// while more than 8 characters stand; a phone always fits the field; a fall is never drawn larger.

import { GHOST_FALLING, GHOST_OUT, type ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawFall } from './fall.js';
import {
  BODY_SHARE,
  CAP_FROM_PX,
  CLOSE_FILL,
  FEW_STANDING,
  cameraBox,
  halfPx,
  playBox,
} from './field.js';
import { ghostRadiusPx } from './reach.js';
import { fitBox, sx } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;
// `n` characters standing (the zoom cap's crowd), `flags` more beside them falling or out.
const crowd = (n: number, ...flags: number[]) =>
  [...Array<number>(n).fill(0), ...flags].map((f) => ({ flags: f }));
const CROWD = crowd(FEW_STANDING + 1);
const sumo = (r: number, ghosts = CROWD): ServerState =>
  ({
    mode: 0,
    wall: 0,
    area: { x: 1000, y: 1000, r },
    next: null,
    ghosts,
  }) as unknown as ServerState;
const walled = (mode: number, wall: number, ghosts = CROWD): ServerState =>
  ({ mode, wall, area: null, next: null, ghosts }) as unknown as ServerState;

const TOP = 128;
const room = { keepOut: [], marginPx: 8 };
const view = (w: number, h: number, s: ServerState) => {
  const c = ctx(w, h);
  return fitBox(c, TOP, cameraBox(s, { ctx: c, top: TOP, room }), room);
};
const diameter = (w: number, h: number, s: ServerState): number => 2 * ghostRadiusPx(view(w, h, s));
const fieldWidth = (w: number, h: number, s: ServerState): number => {
  const v = view(w, h, s);
  const b = playBox(s);
  return sx(v, b.x + b.half) - sx(v, b.x - b.half);
};

describe('the zoom cap', () => {
  const late = [sumo(143), sumo(50), walled(2, 150), walled(1, 260)];

  for (const [w, h, capPx] of [
    [1280, 800, 48],
    [800, 1280, 48],
    [600, 960, 36],
  ] as const) {
    it(`never draws a body wider than 6 % of the shorter side from 600 px on (${String(w)}×${String(h)}: ${String(capPx)} px)`, () => {
      expect(BODY_SHARE * Math.min(w, h)).toBeCloseTo(capPx, 6);
      for (const s of [sumo(400), ...late, walled(2, 700)])
        expect(diameter(w, h, s)).toBeLessThanOrEqual(capPx + 1e-9);
      expect(diameter(w, h, sumo(50))).toBeCloseTo(capPx, 6); // a tiny arena: the cap holds it
    });
  }

  for (const [w, h] of [
    [390, 844],
    [599, 900],
    [844, 390],
  ] as const) {
    it(`has no cap below 600 px: the camera always fits the field (${String(w)}×${String(h)})`, () => {
      expect(Math.min(w, h)).toBeLessThan(CAP_FROM_PX);
      for (const s of [sumo(400), ...late, walled(2, 700)])
        expect(cameraBox(s, { ctx: ctx(w, h), top: TOP, room }).half).toBeLessThan(
          playBox(s).half + 60, // the area, a character on its edge and the fence's posts
        );
      // A tiny arena drawn larger than any cap would allow: the island fills the width.
      expect(diameter(w, h, sumo(50))).toBeGreaterThan(BODY_SHARE * Math.min(w, h));
    });
  }

  it("fills a phone's width to the end: late Sumo, King and Bomb", () => {
    for (const s of [sumo(143), walled(1, 260), walled(2, 150)])
      expect(fieldWidth(390, 844, s)).toBeGreaterThan(0.8 * (390 - 16));
  });

  it('keeps the desktop at the start as before: the cap does not bind there', () => {
    for (const s of [sumo(400), walled(2, 700), walled(1, 450)])
      expect(diameter(1280, 800, s)).toBeLessThan(48);
  });

  it('draws a falling character never larger than a standing one', () => {
    for (const t of [0, 0.1, 0.2, 0.4, 0.6, 0.8]) {
      const r = recorder();
      drawFall(r.ctx, { x: 400, y: 300, r: 12, team: 1, left: false }, t);
      for (const b of bodies(r)) expect(b.r).toBeLessThanOrEqual(12);
    }
  });
});

describe('the zoom cap with 8 or fewer standing', () => {
  // The island's share of the room the camera fits it into (halfPx: half of that room).
  const share = (w: number, h: number, s: ServerState): number =>
    fieldWidth(w, h, s) / (2 * halfPx({ ctx: ctx(w, h), top: TOP, room }));

  it('comes closer with 8 or fewer standing: late Sumo fills two thirds, on the desktop and in the viewer', () => {
    for (const [w, h] of [
      [1280, 800],
      [1920, 1080],
    ] as const) {
      const few = sumo(143, crowd(FEW_STANDING));
      expect(share(w, h, sumo(143))).toBeLessThan(0.55); // more than 8: the cap, about half
      expect(share(w, h, few)).toBeCloseTo(CLOSE_FILL, 6);
      expect(diameter(w, h, few)).toBeGreaterThan(BODY_SHARE * Math.min(w, h));
      // Falling and fallen characters do not count: 8 standing among 10.
      expect(share(w, h, sumo(143, crowd(8, GHOST_FALLING, GHOST_OUT)))).toBeCloseTo(CLOSE_FILL, 6);
    }
  });

  it('with 8 or fewer never comes closer than a phone would, nor goes further out than the cap', () => {
    const tiny = sumo(50, crowd(2));
    const half = cameraBox(tiny, { ctx: ctx(1280, 800), top: TOP, room }).half;
    expect(half).toBeGreaterThanOrEqual(50 / CLOSE_FILL - 1e-9);
    expect(half).toBeGreaterThanOrEqual(
      cameraBox(tiny, { ctx: ctx(390, 844), top: TOP, room }).half,
    );
    // A small match at the start: no further out than with the crowd.
    expect(diameter(1280, 800, sumo(400, crowd(6)))).toBeCloseTo(diameter(1280, 800, sumo(400)), 6);
    expect(diameter(1280, 800, walled(2, 700, crowd(6)))).toBeCloseTo(
      diameter(1280, 800, walled(2, 700)),
      6,
    );
  });
});
