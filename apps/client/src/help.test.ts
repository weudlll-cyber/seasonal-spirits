// Seasonal Sumo — the help card's hint of more (owner 2026-11-20: its last line was cut in half
// with nothing saying there was more): the fade shows while more lies below the card's edge and
// is gone at the end, and never on a card that fits.

import { describe, expect, it } from 'vitest';
import { moreBelow } from './help.js';

describe("the help card's fade", () => {
  it('shows while more of the card lies below, gone at its end', () => {
    expect(moreBelow({ scrollTop: 0, clientHeight: 600, scrollHeight: 900 })).toBe(true);
    expect(moreBelow({ scrollTop: 250, clientHeight: 600, scrollHeight: 900 })).toBe(true);
    expect(moreBelow({ scrollTop: 300, clientHeight: 600, scrollHeight: 900 })).toBe(false);
    expect(moreBelow({ scrollTop: 299.5, clientHeight: 600, scrollHeight: 900 })).toBe(false);
  });

  it('never shows on a card that fits', () => {
    expect(moreBelow({ scrollTop: 0, clientHeight: 600, scrollHeight: 600 })).toBe(false);
  });
});
