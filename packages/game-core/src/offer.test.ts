// Seasonal Spirits — the shrine offer: the number the Secure button shows comes from the core.

import { describe, expect, it } from 'vitest';
import { shrineOffer } from './actions.js';
import { DEFAULT_CONFIG } from './config.js';
import { matchOf, placeAtShrine, quietConfig } from './test-helpers.js';

describe('shrine offer', () => {
  it('offers "Secure: 48" for 10 Spring + 4 Summer in spring (4 and 2 each)', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    g.carried.summer = 4;
    expect(shrineOffer(DEFAULT_CONFIG, m.state, g)).toEqual({ secureValue: 48 });
  });
});
