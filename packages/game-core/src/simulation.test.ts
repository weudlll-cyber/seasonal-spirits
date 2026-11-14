// Seasonal Spirits — a full 32-bot match: deterministic per seed, sanity list green.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { simulate } from './simulation.js';

describe('simulated match', () => {
  it('is identical for the same seed and differs for another seed', () => {
    const a = simulate(DEFAULT_CONFIG, 7);
    const b = simulate(DEFAULT_CONFIG, 7);
    const c = simulate(DEFAULT_CONFIG, 8);
    expect(a.result).toEqual(b.result);
    expect(a.result).not.toEqual(c.result);
  });

  it('passes every sanity check and banks value for every strategy', () => {
    const r = simulate(DEFAULT_CONFIG, 1);
    expect(r.sanity.filter((c) => !c.ok)).toEqual([]);
    expect(r.seasons.map((e) => e.season)).toEqual(['summer', 'autumn', 'winter']);
    expect(r.halving?.atMs).toBe(DEFAULT_CONFIG.halvingAtMs);
    for (const strategy of ['patient', 'cautious', 'hunter']) {
      const ids = new Set(r.roster.filter((x) => x.strategy === strategy).map((x) => x.id));
      const total = r.result.players
        .filter((p) => ids.has(p.id))
        .reduce((n, p) => n + p.secured, 0);
      expect(total, strategy).toBeGreaterThan(0);
    }
  });
});
