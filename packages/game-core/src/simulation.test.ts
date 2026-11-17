// Seasonal Sumo — a full 32-bot match: deterministic per seed, sanity list green, lively.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { botRoster, simulate } from './simulation.js';

describe('simulated match', () => {
  it('is identical for the same seed and differs for another seed', () => {
    // 8 bots keep this quick; determinism does not depend on the count.
    const a = simulate(DEFAULT_CONFIG, 7, botRoster(8));
    const b = simulate(DEFAULT_CONFIG, 7, botRoster(8));
    const c = simulate(DEFAULT_CONFIG, 8, botRoster(8));
    expect(a.result).toEqual(b.result);
    expect(a.result).not.toEqual(c.result);
  });

  // A whole 32-bot match: about 2 s alone, over 5 s beside the rest of the suite on a busy
  // machine (as match-host.test.ts's whole match).
  it('passes every sanity check, and every team scores knockouts', { timeout: 20_000 }, () => {
    const r = simulate(DEFAULT_CONFIG, 1);
    expect(r.sanity.filter((c) => !c.ok)).toEqual([]);
    // Each halving on its season turn; with lives the match may end before the last (FIX
    // 2026-11-17: the bots' relative edge margin lets fewer last).
    const turns = [
      [75_000, 'summer'],
      [150_000, 'autumn'],
      [225_000, 'winter'],
    ];
    expect(r.halvings.length).toBeGreaterThan(0);
    expect(r.halvings.map((h) => [h.atMs, h.season])).toEqual(turns.slice(0, r.halvings.length));
    for (const k of r.result.teams) expect(k).toBeGreaterThan(0);
  });
});
