// Seasonal Spirits — the match recap's awards: the closest save and the last secure, from the
// events tick by tick; none without an event.

import { describe, expect, it } from 'vitest';
import { NO_AWARDS, noteAwards, type Awards } from './recap.js';
import { act, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';
import type { MatchEvent, MatchState } from './types.js';

// Folds ticks of events, each a list, as the match host does.
function fold(ticks: MatchEvent[][]): Awards {
  return ticks.reduce((a, events) => noteAwards(a, { events } as MatchState), NO_AWARDS);
}

const secured = (ghost: number, value: number, leftMs: number): MatchEvent => ({
  type: 'secured',
  ghost,
  value,
  leftMs,
});

describe('match recap awards', () => {
  it('leaves every award out when nothing happened', () => {
    expect(fold([[], [{ type: 'secure-start', ghost: 1 }]])).toEqual(NO_AWARDS);
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
    expect(g.securedValue).toBe(4); // banked at Spring's value, after the halving
    expect(a.closestSave).toEqual({ ghost: 1, leftMs: 950 });
  });
});
