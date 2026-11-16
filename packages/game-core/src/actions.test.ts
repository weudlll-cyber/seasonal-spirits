// Seasonal Spirits — securing at the own shrine, including every way a request can be refused.

import { describe, expect, it } from 'vitest';
import { ghost, matchOf, placeAtShrine, quietConfig, runTo, act } from './test-helpers.js';

describe('secure at the own shrine', () => {
  it('banks the current value after the configured time and stands still meanwhile', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    const x = g.x;
    g.carried.spring = 10;
    g.carried.summer = 15;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    act(m, 1, { dx: 1, dy: 0 }, cfg.secureDurationMs - 100);
    expect(g.securedValue).toBe(0);
    expect(g.x).toBe(x);
    act(m, 1, { dx: 1, dy: 0 }, 100);
    // V5 prices in spring: spring in season 4, summer next 2.
    expect(g.securedValue).toBe(10 * 4 + 15 * 2);
    expect(g.carried).toEqual({ spring: 0, summer: 0, autumn: 0, winter: 0 });
  });

  it('is refused away from the own shrine and with nothing carried', () => {
    const m = matchOf(quietConfig(), [
      { id: 1, team: 0 },
      { id: 2, team: 0 },
    ]);
    const away = ghost(m, 1);
    away.carried.spring = 5;
    away.x = 1000;
    away.y = 1000;
    placeAtShrine(m, 2);
    m.tick(
      50,
      new Map([
        [1, { dx: 0, dy: 0, action: 'secure' }],
        [2, { dx: 0, dy: 0, action: 'secure' }],
      ]),
    );
    expect(m.state.ghosts.every((g) => g.securingUntilMs === null)).toBe(true);
  });

  it('a cautious player who secures early keeps the value through every halving', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    runTo(m, 300_000);
    expect(m.result().players[0]?.secured).toBe(40); // banked at spring's price, kept
  });
});
