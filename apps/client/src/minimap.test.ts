// Seasonal Sumo — the minimap's corner: top right, just below the bar, inside the screen.

import { describe, expect, it } from 'vitest';
import { minimapRect } from './minimap.js';

describe('minimap corner', () => {
  it('sits top right, just below the bar and inside the screen', () => {
    const r = minimapRect(412, 839, 132);
    expect(r.top).toBeGreaterThan(132);
    expect(r.left).toBeGreaterThan(206);
    expect(r.right).toBeLessThanOrEqual(412);
  });
});
