// Seasonal Spirits — the minimap's corner: away from the own shrine's side of the field, so it
// never covers the own shrine and its label (found in session 2026-11-15-B).

import { describe, expect, it } from 'vitest';
import { minimapRect } from './minimap.js';

describe('minimap corner', () => {
  it('goes top right for the teams whose shrine is on the left, top left for the others', () => {
    // Shrines: team 0 top left, 1 top right, 2 bottom right, 3 bottom left (game core).
    const sides = [0, 1, 2, 3].map((team) => minimapRect(412, 839, 104, team).left > 206);
    expect(sides).toEqual([true, false, false, true]);
  });

  it('sits just below the bar and inside the screen', () => {
    const r = minimapRect(412, 839, 104, 0);
    expect(r.top).toBeGreaterThan(104);
    expect(r.right).toBeLessThanOrEqual(412);
  });
});
