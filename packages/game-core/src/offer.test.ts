// Seasonal Spirits — the shrine offer: the numbers the two buttons show come from the core.

import { describe, expect, it } from 'vitest';
import { shrineOffer, trySwap } from './actions.js';
import { DEFAULT_CONFIG } from './config.js';
import { matchOf, placeAtShrine, quietConfig } from './test-helpers.js';

describe('shrine offer', () => {
  it('offers "Secure (12)" and "Swap (15 Summer, worth 7.5 now / 15 later)" for 10 Spring + 4 Summer', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    g.carried.summer = 4;
    expect(shrineOffer(DEFAULT_CONFIG, m.state, g)).toEqual({
      secureValue: 12,
      swapCoins: 15,
      swapValueNow: 7.5,
      swapValueLater: 15,
    });
  });

  it('offers no swap below swapMinIn (6) coins of the current season', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 5;
    expect(shrineOffer(DEFAULT_CONFIG, m.state, g).swapCoins).toBe(0);
  });

  it('offers exactly what a swap then gives', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 23;
    const offered = shrineOffer(DEFAULT_CONFIG, m.state, g).swapCoins;
    trySwap(DEFAULT_CONFIG, m.state, g);
    expect(g.carried.summer).toBe(offered);
  });
});
