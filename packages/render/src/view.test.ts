// Seasonal Sumo — the camera: a square of the field as large as it goes below the bar, clear of
// the controls in the bottom corners.

import { describe, expect, it } from 'vitest';
import { FIELD, clearArea, fitBox, fitField, sx, sy } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;

describe('camera', () => {
  it('shows the whole field below the clock for the viewer', () => {
    const v = fitField(ctx(1000, 664), 64);
    expect(sy(v, 0)).toBeCloseTo(64);
    expect(sy(v, FIELD)).toBeCloseTo(664);
    expect(sx(v, FIELD) - sx(v, 0)).toBeCloseTo(600);
  });

  it('fits a square around any centre, with the margin to the edges', () => {
    const v = fitBox(
      ctx(800, 664),
      64,
      { x: 700, y: 1300, half: 300 },
      { keepOut: [], marginPx: 10 },
    );
    expect(sy(v, 1000)).toBeCloseTo(74);
    expect(sy(v, 1600)).toBeCloseTo(654);
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
    const dash = { left: 680, top: 540, right: 790, bottom: 650 };
    const stick = { left: 0, top: 400, right: 200, bottom: 664 };
    expect(clearArea(800, 664, 64, [dash, stick])).toEqual({
      left: 200,
      top: 64,
      right: 680,
      bottom: 664,
    });
  });
});
