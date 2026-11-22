// Seasonal Sumo — season order and the season clock: the four seasons in turn, one per halving.
// The modes' halvings and the clients' clock line rest on them.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { nextSeason, seasonClock } from './seasons.js';

describe('seasons', () => {
  it('follow the real order Spring → Summer → Autumn → Winter → Spring', () => {
    expect(nextSeason('spring')).toBe('summer');
    expect(nextSeason('summer')).toBe('autumn');
    expect(nextSeason('autumn')).toBe('winter');
    expect(nextSeason('winter')).toBe('spring');
  });

  it('run 75 s each from the configured start season', () => {
    const cfg = { ...DEFAULT_CONFIG, startSeason: 'autumn' as const };
    expect(seasonClock(cfg, 0)).toEqual({
      current: 'autumn',
      next: 'winter',
      index: 0,
      timeLeftMs: 75_000,
    });
    expect(seasonClock(cfg, 80_000).current).toBe('winter');
    expect(seasonClock(cfg, 160_000).current).toBe('spring');
    expect(seasonClock(cfg, 299_000)).toMatchObject({
      current: 'summer',
      index: 3,
      timeLeftMs: 1000,
    });
  });
});
