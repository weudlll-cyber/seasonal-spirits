// Seasonal Sumo — the camera: a square of the field, seen at a slant with the island's rock
// under it, as large as it goes below the bar, clear of the controls in the bottom corners; on a
// portrait phone the playing surface fills the height above the controls at a steeper slant.

import { describe, expect, it } from 'vitest';
import { FIELD, ISLAND_DEPTH, MAX_TILT, VIEW_TILT, fitBox, fitField, sx, sy } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;

describe('camera', () => {
  it('shows the whole field and the rock under it below the clock for the viewer', () => {
    const v = fitField(ctx(1000, 664), 64);
    // 600 px tall: the squashed field (2 × VIEW_TILT) and the rock (ISLAND_DEPTH) per half side.
    const perHalf = 600 / (2 * VIEW_TILT + ISLAND_DEPTH);
    expect(sy(v, 0)).toBeCloseTo(64);
    expect(sy(v, FIELD) + ISLAND_DEPTH * perHalf).toBeCloseTo(664);
    expect(sx(v, FIELD) - sx(v, 0)).toBeCloseTo(2 * perHalf);
  });

  it('squashes the depth of the field by the view tilt, not its width', () => {
    const v = fitField(ctx(1000, 664), 64);
    expect(sy(v, FIELD) - sy(v, 0)).toBeCloseTo((sx(v, FIELD) - sx(v, 0)) * VIEW_TILT);
  });

  it('fits a box around any centre, with the margin to the edges', () => {
    const v = fitBox(
      ctx(800, 664),
      64,
      { x: 700, y: 1300, half: 300 },
      { keepOut: [], marginPx: 10 },
    );
    const perHalf = 580 / (2 * VIEW_TILT + ISLAND_DEPTH);
    expect(sy(v, 1000)).toBeCloseTo(74);
    expect(sy(v, 1600) + ISLAND_DEPTH * perHalf).toBeCloseTo(654);
    expect(sx(v, 700)).toBeCloseTo(400);
  });

  it('keeps a desktop between its bottom controls, at the usual slant', () => {
    const dash = { left: 880, top: 540, right: 990, bottom: 650 };
    const stick = { left: 0, top: 400, right: 200, bottom: 664 };
    const room = { keepOut: [dash, stick], marginPx: 0 };
    const v = fitBox(ctx(1000, 664), 64, { x: 1000, y: 1000, half: 1000 }, room);
    expect(v.tilt).toBe(VIEW_TILT);
    // As wide as the strip; the whole island, rock included, between the bar and the bottom.
    expect(sx(v, 0)).toBeCloseTo(200);
    expect(sx(v, 2000)).toBeCloseTo(880);
    expect(sy(v, 0)).toBeGreaterThanOrEqual(64);
    expect(sy(v, 2000) + ISLAND_DEPTH * 1000 * v.scale).toBeLessThanOrEqual(664);
  });

  // NIGHT 2026-11-19: on a portrait phone the island filled only the top third.
  it('fills a portrait phone between the band and the controls, turning the view steeper', () => {
    const stick = { left: 0, top: 584, right: 195, bottom: 844 };
    const actions = { left: 200, top: 740, right: 374, bottom: 828 };
    const room = { keepOut: [stick, actions], marginPx: 8 };
    const v = fitBox(ctx(390, 844), 104, { x: 1000, y: 1000, half: 1000 }, room);
    expect(v.tilt).toBe(MAX_TILT);
    // As wide as the screen allows; the playing surface clear of the band and the controls.
    expect(sx(v, 0)).toBeCloseTo(8);
    expect(sx(v, 2000)).toBeCloseTo(382);
    expect(sy(v, 0)).toBeGreaterThanOrEqual(112);
    expect(sy(v, 2000)).toBeLessThanOrEqual(576);
    // The rock under it may reach over the controls, but not past the bottom edge.
    expect(sy(v, 2000) + ISLAND_DEPTH * 1000 * v.scale).toBeLessThanOrEqual(836);
  });
});
