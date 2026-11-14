// Seasonal Spirits — render clock tests: smooth linear advance; resync on drift.

import { describe, expect, it } from 'vitest';
import { RenderClock } from './render-clock.js';

describe('RenderClock', () => {
  it('initialises at latest - buffer', () => {
    const c = new RenderClock({ bufferMs: 100 });
    expect(c.target(1000, 500)).toBe(400);
  });

  it('advances linearly with wall time between state arrivals', () => {
    const c = new RenderClock({ bufferMs: 100 });
    c.target(1000, 500); // init → 400
    const t1 = c.target(1016, 500); // 16 ms wall → 416
    expect(t1).toBeCloseTo(416, 5);
  });

  it('advances linearly through many frames with static latest', () => {
    const c = new RenderClock({ bufferMs: 100, resyncToleranceMs: 1000 });
    c.target(1000, 500);
    const t = c.target(1100, 500); // 100 ms → 500
    expect(t).toBeCloseTo(500, 5);
  });

  it('resyncs when the clock drifts outside tolerance', () => {
    const c = new RenderClock({ bufferMs: 100, resyncToleranceMs: 50 });
    c.target(1000, 500); // init → 400
    // Wall jumps 10 s with no state → target would be 10400; desired is 400. Snap back.
    const t = c.target(11000, 500);
    expect(t).toBe(400);
  });

  it('returns null when no state has been seen', () => {
    const c = new RenderClock({ bufferMs: 100 });
    expect(c.target(0, null)).toBeNull();
  });
});
