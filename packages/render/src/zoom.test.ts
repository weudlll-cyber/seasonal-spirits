// Seasonal Sumo — the zoom cap (planner 2026-11-19): the camera fits the playing area as large as
// it goes, but never so close that a character's body diameter on screen exceeds 6 % of the
// screen's shorter side (48 px at 1280×800, 23.4 px at 390×844), in every mode — a late halving
// shows more sky round the island instead of ever larger characters, and on a phone late King's
// small field fills the width again; a falling character is never drawn larger than a standing
// one.

import type { ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawFall } from './fall.js';
import { BODY_SHARE, cameraBox, playBox } from './field.js';
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
  for (const [w, h, capPx] of [
    [1280, 800, 48],
    [390, 844, 23.4],
  ] as const) {
    it(`never draws a body wider than 6 % of the shorter side, any mode (${String(w)}×${String(h)}: ${String(capPx)} px)`, () => {
      expect(BODY_SHARE * Math.min(w, h)).toBeCloseTo(capPx, 6);
      for (const s of [
        sumo(400),
        sumo(143),
        sumo(50),
        walled(2, 700),
        walled(2, 150),
        walled(1, 260),
      ])
        expect(diameter(w, h, s)).toBeLessThanOrEqual(capPx + 1e-9);
      expect(diameter(w, h, sumo(50))).toBeCloseTo(capPx, 6); // a tiny arena: the cap holds it
    });
  }

  it('lets the match start fit the screen as before: the cap does not bind there', () => {
    for (const [w, h] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      for (const s of [sumo(400), walled(2, 700), walled(1, 450)]) {
        expect(cameraBox(s, { ctx: ctx(w, h), top: TOP, room }).half).toBeLessThan(
          playBox(s).half + 60, // the area, a character on its edge and the fence's posts
        );
        expect(diameter(w, h, s)).toBeLessThan(BODY_SHARE * Math.min(w, h));
      }
    }
  });

  it("fills a phone's width with late King's smallest field (owner's p18 phone picture)", () => {
    expect(fieldWidth(390, 844, walled(1, 260))).toBeGreaterThan(0.9 * (390 - 16));
  });

  it('draws a falling character never larger than a standing one', () => {
    for (const t of [0, 0.1, 0.2, 0.4, 0.6, 0.8]) {
      const r = recorder();
      drawFall(r.ctx, { x: 400, y: 300, r: 12, team: 1, left: false }, t);
      for (const b of bodies(r)) expect(b.r).toBeLessThanOrEqual(12);
    }
  });
});
