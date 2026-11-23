// Seasonal Sumo — the sky's cached backdrop layers on a canvas without a size. Why: a window with
// no size yet drew an empty layer, the browser threw, and the client's frame loop stopped for good.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawBackdrop, drawFrontClouds } from './sky.js';

// A context whose drawImage refuses an empty canvas, as the browser's does.
function strictCtx(
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; drawn: () => number } {
  let drawn = 0;
  const ctx = {
    canvas: { width, height },
    drawImage: (img: { width: number; height: number }) => {
      if (img.width === 0 || img.height === 0) throw new Error('InvalidStateError');
      drawn++;
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, drawn: () => drawn };
}

describe('backdrop layers', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws nothing and does not throw on a canvas of no width or no height', () => {
    for (const [w, h] of [
      [0, 768],
      [1536, 0],
      [0, 0],
    ] as const) {
      const c = strictCtx(w, h);
      expect(() => {
        drawBackdrop(c.ctx);
        drawFrontClouds(c.ctx);
      }).not.toThrow();
      expect(c.drawn()).toBe(0);
    }
  });

  it('draws each layer once on a canvas with a size', () => {
    const c = strictCtx(1536, 768);
    drawBackdrop(c.ctx);
    drawFrontClouds(c.ctx);
    expect(c.drawn()).toBe(2);
  });
});
