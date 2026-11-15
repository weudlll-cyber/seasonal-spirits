// Seasonal Spirits — the camera: it follows the own ghost but never shows past the field edge.

import { describe, expect, it } from 'vitest';
import { FIELD, fitField, follow, sx, sy } from './view.js';

const ctx = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;

describe('camera', () => {
  it('centres the own ghost in the middle of the field', () => {
    const v = follow(ctx(800, 664), 64, { x: 1000, y: 1000 }, { span: 1000, bottomPad: 0 });
    expect(sx(v, 1000)).toBeCloseTo(400);
    expect(sy(v, 1000)).toBeCloseTo(64 + 300);
  });

  it('stops at the field edge instead of showing what lies beyond it', () => {
    const v = follow(ctx(800, 664), 64, { x: 0, y: 0 }, { span: 1000, bottomPad: 0 });
    expect(sx(v, 0)).toBeCloseTo(0);
    expect(sy(v, 0)).toBeCloseTo(64);
    const far = follow(ctx(800, 664), 64, { x: FIELD, y: FIELD }, { span: 1000, bottomPad: 0 });
    expect(sx(far, FIELD)).toBeCloseTo(800);
    expect(sy(far, FIELD)).toBeCloseTo(664);
  });

  it('may look past the bottom edge by the pad, so the field rises above bottom controls', () => {
    const v = follow(ctx(800, 664), 64, { x: FIELD, y: FIELD }, { span: 1000, bottomPad: 120 });
    expect(sy(v, FIELD)).toBeCloseTo(664 - 120);
    const mid = follow(ctx(800, 664), 64, { x: 1000, y: 1000 }, { span: 1000, bottomPad: 120 });
    expect(sy(mid, 1000)).toBeCloseTo(64 + 300);
  });

  it('shows the whole field below the clock for spectators', () => {
    const v = fitField(ctx(1000, 664), 64);
    expect(sy(v, 0)).toBeCloseTo(64);
    expect(sy(v, FIELD)).toBeCloseTo(664);
    expect(sx(v, FIELD) - sx(v, 0)).toBeCloseTo(600);
  });
});
