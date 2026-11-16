// Seasonal Spirits — the match recap's awards: the best nose (V5), the closest save and the last
// secure, from the events tick by tick; none without an event.

import { describe, expect, it } from 'vitest';
import { NO_AWARDS, noteAwards, type Awards } from './recap.js';
import { act, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';
import type { MatchEvent, MatchState } from './types.js';

// Folds ticks of events, each a list, as the match host does.
function fold(ticks: MatchEvent[][]): Awards {
  return ticks.reduce((a, events) => noteAwards(a, { events } as MatchState), NO_AWARDS);
}

const secured = (ghost: number, value: number, leftMs: number, crossedValue = 0): MatchEvent => ({
  type: 'secured',
  ghost,
  value,
  leftMs,
  crossedValue,
});

describe('match recap awards', () => {
  it('leaves every award out when nothing happened', () => {
    expect(fold([[], [{ type: 'secure-start', ghost: 1 }]])).toEqual(NO_AWARDS);
  });

  it('gives the best nose to the most points from coins carried across a halving, summed', () => {
    const a = fold([
      [secured(1, 20, 9000, 16)],
      [secured(2, 30, 9000, 20), secured(3, 50, 9000, 0)],
      [secured(1, 8, 9000, 8)], // ghost 1: 16 + 8 = 24
    ]);
    expect(a.bestNose).toEqual({ ghost: 1, value: 24 });
    expect(fold([[secured(3, 50, 9000, 0)]]).bestNose).toBeNull();
  });

  it('gives the closest save to the least time left, the last secure to the last one', () => {
    const a = fold([
      [secured(1, 10, 30_000)],
      [secured(2, 4.5, 800), secured(3, 7, 800)],
      [secured(4, 2, 60_000)],
    ]);
    expect(a.closestSave).toEqual({ ghost: 2, leftMs: 800 });
    expect(a.lastSecure).toEqual({ ghost: 4, value: 2 });
  });

  it('measures a save at the start of the secure, before the halving it beat', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    runTo(m, cfg.seasonDurationMs - 1000);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 4;
    let a = NO_AWARDS;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' }); // started 950 ms before the halving
    while (m.state.elapsedMs < cfg.seasonDurationMs + cfg.secureDurationMs) {
      m.tick(50, new Map());
      a = noteAwards(a, m.state);
    }
    expect(g.securedValue).toBe(16); // banked at Spring's price (4), after the halving
    expect(a.closestSave).toEqual({ ghost: 1, leftMs: 950 });
    expect(a.bestNose).toBeNull(); // picked up and secured in spring: nothing crossed
  });

  it('counts only coins carried across a halving for the best nose, at the price of the secure', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.summer = 5; // picked up in spring, the next season
    runTo(m, cfg.seasonDurationMs + 100); // the halving: summer in season
    g.carried.autumn = 3; // picked up after the halving: does not count
    let a = NO_AWARDS;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    while (m.state.elapsedMs < cfg.seasonDurationMs + 200 + cfg.secureDurationMs) {
      m.tick(50, new Map());
      a = noteAwards(a, m.state);
    }
    expect(g.securedValue).toBe(5 * 4 + 3 * 2); // summer in season, autumn next
    expect(a.bestNose).toEqual({ ghost: 1, value: 20 });
  });
});
