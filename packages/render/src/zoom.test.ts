// Seasonal Sumo — the zoom cap (planner 2026-11-19, decision BACKLOG am): on a screen whose
// shorter side is at least 600 px the camera never comes so close that a character's body
// diameter exceeds 6 % of that side (48 px at 1280×800) — a late halving shows more sky round the
// island instead of ever larger characters; below 600 px (a phone) there is no cap and the
// camera always fits the field, so late Sumo, King and Bomb fill the width to the end. A falling
// character is never drawn larger than a standing one.

import type { ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawFall } from './fall.js';
import { BODY_SHARE, CAP_FROM_PX, cameraBox, playBox } from './field.js';
import { ghostRadiusPx } from './reach.js';
import { fitBox, sx } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;
const sumo = (r: number): ServerState =>
  ({ mode: 0, wall: 0, area: { x: 1000, y: 1000, r }, next: null }) as unknown as ServerState;
const walled = (mode: number, wall: number): ServerState =>
  ({ mode, wall, area: null, next: null }) as unknown as ServerState;

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
