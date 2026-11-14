// Seasonal Spirits — the balance numbers: percentiles, rotating teams, shares that add up.

import { describe, expect, it } from 'vitest';
import { rotatedRoster, runBalance, spread } from './balance.js';
import { DEFAULT_CONFIG } from './config.js';

describe('balance', () => {
  it('reports mean, median, p10 and p90 of the values', () => {
    expect(spread([10, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({
      n: 10,
      mean: 5.5,
      median: 5.5,
      p10: 1,
      p90: 9,
    });
    expect(spread([3, 1, 2]).median).toBe(2);
  });

  it('rotates every slot through the four teams, keeping 8 ghosts per team', () => {
    for (let k = 0; k < 4; k++) {
      const r = rotatedRoster(k);
      expect(r[0]?.team).toBe(k % 4);
      for (let t = 0; t < 4; t++) expect(r.filter((x) => x.team === t)).toHaveLength(8);
    }
  });

  it('splits every match win exactly once among strategies and among teams', () => {
    // Short matches keep this quick; the bookkeeping is the same.
    const short = { ...DEFAULT_CONFIG, seasonDurationMs: 15_000, matchDurationMs: 60_000 };
    const r = runBalance(short, 2, 1);
    const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    expect(sum(Object.values(r.bestPlayerShare))).toBeCloseTo(1);
    expect(sum(r.teamWinShare)).toBeCloseTo(1);
    expect(r.secured.patient.n + r.secured.cautious.n + r.secured.hunter.n).toBe(64);
  });
});
