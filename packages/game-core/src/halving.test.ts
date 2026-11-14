// Seasonal Spirits — the halving: halves, pool, countdown, one-tick event, the match end.

import { describe, expect, it } from 'vitest';
import { act, ghost, matchOf, quietConfig, runTo } from './test-helpers.js';
import type { MatchEvent } from './types.js';

describe('halving', () => {
  it('halves every carried count at 3:45 and puts the halves into the centre pool', () => {
    const m = matchOf(quietConfig(), [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    const a = ghost(m, 1);
    const b = ghost(m, 2);
    a.carried.autumn = 33;
    b.carried.winter = 4;
    a.securedValue = 12;
    runTo(m, 225_000);
    expect(a.carried.autumn).toBe(16);
    expect(b.carried.winter).toBe(2);
    expect(m.state.pool).toEqual({ spring: 0, summer: 0, autumn: 17, winter: 2 });
    expect(a.securedValue).toBe(12); // secured value is untouched
  });

  it('carries a 10 s countdown before it and none after it', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    runTo(m, 214_000);
    expect(m.state.halvingCountdownMs).toBeNull();
    runTo(m, 216_000);
    expect(m.state.halvingCountdownMs).toBe(9000);
    runTo(m, 225_000);
    expect(m.state.halvingCountdownMs).toBeNull();
  });

  it('emits the HALVING event in exactly one tick', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const seen: MatchEvent[] = [];
    while (!m.state.ended) seen.push(...m.tick(50, new Map()).events);
    expect(seen.filter((e) => e.type === 'halving')).toHaveLength(1);
  });

  it('lets any ghost take pool coins one per interval', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    g.carried.spring = 10;
    runTo(m, 225_000);
    g.x = m.state.poolCenter.x;
    g.y = m.state.poolCenter.y;
    act(m, 1, { dx: 0, dy: 0 }, cfg.poolTakeIntervalMs);
    act(m, 1, { dx: 0, dy: 0 }, cfg.poolTakeIntervalMs);
    expect(g.carried.spring).toBe(5 + 2);
    expect(m.state.pool.spring).toBe(3);
  });
});

describe('match end', () => {
  it('counts only secured value; unsecured coins are lost', () => {
    const m = matchOf(quietConfig(), [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    ghost(m, 1).carried.winter = 40;
    ghost(m, 2).securedValue = 3;
    runTo(m, 300_000);
    expect(m.state.ended).toBe(true);
    expect(m.result()).toEqual({
      players: [
        { id: 1, team: 0, secured: 0 },
        { id: 2, team: 1, secured: 3 },
      ],
      teams: [0, 3, 0, 0],
    });
  });

  it('ignores ticks after the end', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    runTo(m, 300_000);
    const t = m.state.tick;
    m.tick(50, new Map());
    expect(m.state.tick).toBe(t);
  });
});
