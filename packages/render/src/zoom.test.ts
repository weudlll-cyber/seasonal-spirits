// Seasonal Sumo — the zoom cap (2026-11-19): late in a match the camera's scale never exceeds
// 1.5 times its scale at the match start (owner 2026-11-19; was twice), in every mode — a late halving shows more sky round the
// island instead of ever larger characters; a falling character is never drawn larger than a
// standing one.

import type { ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawFall } from './fall.js';
import { ZOOM_CAP, cameraBox } from './field.js';
import { fitBox } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;
const sumo = (r: number): ServerState =>
  ({ mode: 0, wall: 0, area: { x: 1000, y: 1000, r }, next: null }) as unknown as ServerState;
const walled = (mode: number, wall: number): ServerState =>
  ({ mode, wall, area: null, next: null }) as unknown as ServerState;

describe('the zoom cap', () => {
  for (const [w, h] of [
    [1280, 800],
    [390, 844],
  ] as const) {
    it(`never draws more than 1.5 times the start's scale, any mode (${String(w)}×${String(h)})`, () => {
      const scale = (s: ServerState): number => fitBox(ctx(w, h), 104, cameraBox(s)).scale;
      const startSumo = scale(sumo(400));
      expect(scale(sumo(284))).toBeLessThan(ZOOM_CAP * startSumo);
      expect(scale(sumo(50))).toBeCloseTo(ZOOM_CAP * startSumo, 6);
      const startBomb = scale(walled(2, 700));
      expect(scale(walled(2, 150))).toBeCloseTo(ZOOM_CAP * startBomb, 6);
      const startKing = scale(walled(1, 450));
      expect(ZOOM_CAP).toBe(1.5);
      expect(scale(walled(1, 250))).toBeLessThanOrEqual(ZOOM_CAP * startKing + 1e-9);
    });
  }

  it('draws a falling character never larger than a standing one', () => {
    for (const t of [0, 0.1, 0.2, 0.4, 0.6, 0.8]) {
      const r = recorder();
      drawFall(r.ctx, { x: 400, y: 300, r: 12, team: 1, left: false }, t);
      for (const b of bodies(r)) expect(b.r).toBeLessThanOrEqual(12);
    }
  });
});
