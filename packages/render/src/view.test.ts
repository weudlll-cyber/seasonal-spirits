// Seasonal Sumo — the camera: a square of the field, seen at a slant with the island's rock
// under it, as large as it goes below the bar, clear of the controls in the bottom corners.

import { describe, expect, it } from 'vitest';
import { FIELD, ISLAND_DEPTH, VIEW_TILT, clearArea, fitBox, fitField, sx, sy } from './view.js';

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

  it('keeps clear of bottom controls: above them when tall, between them when wide', () => {
    const tallDash = { left: 680, top: 1480, right: 790, bottom: 1590 };
    const tallStick = { left: 0, top: 1300, right: 200, bottom: 1600 };
    expect(clearArea(800, 1600, 64, [tallDash, tallStick])).toEqual({
      left: 0,
      top: 64,
      right: 800,
      bottom: 1300,
    });
    const dash = { left: 880, top: 540, right: 990, bottom: 650 };
    const stick = { left: 0, top: 400, right: 200, bottom: 664 };
    expect(clearArea(1000, 664, 64, [dash, stick])).toEqual({
      left: 200,
      top: 64,
      right: 880,
      bottom: 664,
    });
  });
});
