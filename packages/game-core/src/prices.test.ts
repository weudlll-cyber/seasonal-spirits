// Seasonal Spirits — the price board of V5: each coin priced by its season's relation to the
// season in season, the prices moving on at every halving, and the spawn weights drawing each
// season as often as its weight says.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { priceOf, relationOf, spawnSeason, valueNow } from './prices.js';
import { mulberry32 } from './rng.js';
import { SEASONS, emptyCounts, nextSeason, type Season } from './seasons.js';

const prices = { inSeason: 4, next: 2, other: 1 };

describe('price board', () => {
  it('prices the season in season 4, the next season 2 and the other two 1', () => {
    const board = SEASONS.map((s) => priceOf({ prices }, s, 'summer'));
    expect(board).toEqual([1, 4, 2, 1]); // spring, summer, autumn, winter
    expect(relationOf('winter', 'autumn')).toBe('next');
    expect(relationOf('spring', 'winter')).toBe('next'); // after winter comes spring
  });

  it('moves the prices on at every halving: the next season becomes the one in season', () => {
    let current: Season = 'spring';
    for (let turn = 0; turn < 4; turn++) {
      const rising = nextSeason(current);
      expect(priceOf({ prices }, rising, current)).toBe(2);
      current = rising; // the halving
      expect(priceOf({ prices }, rising, current)).toBe(4);
    }
  });

  it('values carried coins as the sum of their current prices', () => {
    const carried = { ...emptyCounts(), spring: 3, summer: 2, winter: 5 };
    expect(valueNow({ prices }, carried, 'spring')).toBe(3 * 4 + 2 * 2 + 5 * 1);
    expect(valueNow({ prices }, carried, 'autumn')).toBe(3 * 1 + 2 * 1 + 5 * 2);
  });

  it('starts at the concept values 4 / 2 / 1 with all four seasons equally often', () => {
    expect(DEFAULT_CONFIG.prices).toEqual(prices);
    expect(DEFAULT_CONFIG.spawnWeights).toEqual({ inSeason: 1, next: 1, other: 1 });
  });
});

// Shares of 20 000 seeded draws per season.
function drawShares(weights: typeof DEFAULT_CONFIG.spawnWeights): Record<Season, number> {
  const rng = mulberry32(7);
  const n = 20_000;
  const count = { ...emptyCounts() };
  for (let i = 0; i < n; i++) count[spawnSeason({ spawnWeights: weights }, 'autumn', rng())]++;
  return {
    spring: count.spring / n,
    summer: count.summer / n,
    autumn: count.autumn / n,
    winter: count.winter / n,
  };
}

describe('spawn weights', () => {
  it('draws every season equally often with equal weights', () => {
    for (const share of Object.values(drawShares({ inSeason: 1, next: 1, other: 1 }))) {
      expect(share).toBeCloseTo(0.25, 1);
    }
  });

  it('follows the weights: the season in season at half weight falls half as often', () => {
    const s = drawShares({ inSeason: 0.5, next: 1, other: 1 }); // autumn in season, winter next
    expect(s.autumn).toBeCloseTo(0.5 / 3.5, 1);
    expect(s.winter).toBeCloseTo(1 / 3.5, 1);
    expect(s.spring).toBeCloseTo(1 / 3.5, 1);
    expect(s.autumn / s.winter).toBeGreaterThan(0.45);
    expect(s.autumn / s.winter).toBeLessThan(0.55);
  });

  it('never draws a season of weight 0', () => {
    const s = drawShares({ inSeason: 1, next: 0, other: 0 });
    expect(s).toEqual({ spring: 0, summer: 0, autumn: 1, winter: 0 });
  });
});
