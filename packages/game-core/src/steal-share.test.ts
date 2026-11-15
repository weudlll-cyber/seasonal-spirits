// Seasonal Spirits — the rule trial "random steal share" (owner decision 2026-11-15, BALANCE.md
// "Round 6"): each steal draws its share from [stealShare, stealShareMax] with the match's
// seeded random source; at least one coin; the default stays today's fixed share.

import { describe, expect, it } from 'vitest';
import { stealShareFor, trySteal } from './actions.js';
import { DEFAULT_CONFIG } from './config.js';
import { mulberry32 } from './rng.js';
import { botRoster, simulate } from './simulation.js';
import { ghost, matchOf, quietConfig } from './test-helpers.js';

const RANGE = { stealShare: 0.2, stealShareMax: 0.5 };

describe('random steal share', () => {
  it('draws every share inside [stealShare, stealShareMax]', () => {
    const cfg = { ...DEFAULT_CONFIG, ...RANGE };
    const rng = mulberry32(7);
    const shares = Array.from({ length: 10_000 }, () => stealShareFor(cfg, rng));
    expect(Math.min(...shares)).toBeGreaterThanOrEqual(0.2);
    expect(Math.max(...shares)).toBeLessThanOrEqual(0.5);
    // Spread over the whole range, not stuck at one end.
    expect(Math.min(...shares)).toBeLessThan(0.21);
    expect(Math.max(...shares)).toBeGreaterThan(0.49);
  });

  it('keeps today’s fixed share by default and draws nothing', () => {
    let draws = 0;
    const counting = (): number => {
      draws++;
      return 0.5;
    };
    expect(stealShareFor(DEFAULT_CONFIG, counting)).toBe(DEFAULT_CONFIG.stealShare);
    expect(stealShareFor({ ...DEFAULT_CONFIG, stealShareMax: 0.5 }, counting)).toBe(0.5);
    expect(draws).toBe(0);
  });

  it('gives the same steals for the same seed', () => {
    const cfg = { ...DEFAULT_CONFIG, ...RANGE };
    const stealsOf = (seed: number): string[] => {
      const out: string[] = [];
      simulate(cfg, seed, botRoster(12), (s) => {
        for (const e of s.events) if (e.type === 'steal') out.push(JSON.stringify(e));
      });
      return out;
    };
    const first = stealsOf(3);
    expect(first.length).toBeGreaterThan(0);
    expect(stealsOf(3)).toEqual(first);
  });

  it('takes at least one coin even when the drawn share is 0', () => {
    const cfg = quietConfig({ stealShare: 0, stealShareMax: 0.5 });
    const m = matchOf(cfg, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    const [victim, thief] = [ghost(m, 1), ghost(m, 2)];
    Object.assign(victim, { x: 1000, y: 1000 });
    Object.assign(thief, { x: 1040, y: 1000 });
    victim.carried.spring = 3;
    victim.carried.summer = 5;
    trySteal(cfg, m.state, thief, () => 0); // the draw at the bottom of the range
    expect(thief.carried).toMatchObject({ spring: 0, summer: 1 }); // from the richest season
    expect(victim.carried).toMatchObject({ spring: 3, summer: 4 });
  });
});
