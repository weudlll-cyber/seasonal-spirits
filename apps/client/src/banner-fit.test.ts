// Seasonal Sumo — the halving banner on a phone (planner 2026-11-19): its text keeps the largest
// size at which it takes at most two lines, never below 14 px.

import { describe, expect, it } from 'vitest';
import { BANNER_MIN_PX, bannerFont } from './banner-fit.js';

// A text of `chars` characters, each 0.55 em wide, in a banner `width` px wide.
const lines = (chars: number, width: number) => (px: number) =>
  Math.ceil((chars * 0.55 * px) / width);

describe('the banner on a phone', () => {
  it('keeps the stylesheet size when the text fits on two lines', () => {
    expect(bannerFont(22, lines(30, 600))).toBe(22);
  });

  it("shrinks a long halving text until it takes two lines (a 390 px phone's banner)", () => {
    const linesAt = lines(70, 300);
    const px = bannerFont(22, linesAt);
    expect(linesAt(px)).toBeLessThanOrEqual(2);
    expect(linesAt(px + 1)).toBeGreaterThan(2);
    expect(px).toBeGreaterThanOrEqual(BANNER_MIN_PX);
  });

  it('never goes below 14 px; a text too long for that wraps further inside the banner', () => {
    expect(bannerFont(22, lines(400, 332))).toBe(BANNER_MIN_PX);
  });
});
