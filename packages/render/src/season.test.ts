// Seasonal Sumo — the season on the island: its colours follow the season in play with a
// cross-fade of about a second at a halving; the first season shows at once.

import { afterEach, describe, expect, it } from 'vitest';
import { look, useLook } from './palette.js';
import { Seasons, mix, tintSeason } from './season.js';

afterEach(() => {
  useLook(false);
});

describe('the season on the island', () => {
  it('shows the first season at once, without a fade', () => {
    const s = new Seasons();
    s.observe(3, 5000);
    expect(s.at(5000)).toEqual({ now: 3, before: 3, k: 1 });
  });

  it('fades from the old season to the new one over about a second', () => {
    const s = new Seasons();
    s.observe(0, 0);
    s.observe(1, 10_000);
    expect(s.at(10_000)).toMatchObject({ now: 1, before: 0, k: 0 });
    expect(s.at(10_500).k).toBeCloseTo(0.5);
    expect(s.at(11_000).k).toBe(1);
  });

  it("tints the island's grass halfway between the seasons in the middle of the fade", () => {
    const s = new Seasons();
    s.observe(0, 0);
    tintSeason(s, 0);
    const spring = look().grass;
    s.observe(3, 1000);
    tintSeason(s, 3000);
    const winter = look().grass;
    expect(winter).not.toBe(spring);
    tintSeason(s, 1500);
    expect(look().grass).toBe(mix(spring, winter, 0.5));
  });

  it('keeps the tint across a switch to Dark, with the dark colours', () => {
    const s = new Seasons();
    s.observe(2, 0);
    tintSeason(s, 0);
    const light = look().crowns[0];
    useLook(true);
    tintSeason(s, 0);
    expect(look().night).toBe(true);
    expect(look().crowns[0]).not.toBe(light);
  });

  it('mixes two colours channel by channel', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });
});
