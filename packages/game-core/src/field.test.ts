// Seasonal Spirits — coins on the field, movement and carrying.

import { describe, expect, it } from 'vitest';
import { act, ghost, matchOf, quietConfig, runTo } from './test-helpers.js';

describe('field coins', () => {
  it('only coins of the current season appear on the field', () => {
    const m = matchOf(quietConfig({ coinSpawnPerSecond: 4 }), [{ id: 1, team: 0 }]);
    runTo(m, 74_000);
    expect(m.state.coins.length).toBeGreaterThan(0);
    expect(new Set(m.state.coins.map((c) => c.season))).toEqual(new Set(['spring']));
    runTo(m, 80_000);
    expect(new Set(m.state.coins.map((c) => c.season))).toEqual(new Set(['summer']));
  });

  it('removes every coin of the old season when the season turns', () => {
    const m = matchOf(quietConfig({ coinSpawnPerSecond: 4 }), [{ id: 1, team: 0 }]);
    runTo(m, 74_950);
    expect(m.state.coins.length).toBeGreaterThan(0);
    runTo(m, 75_000);
    expect(m.state.coins.filter((c) => c.season === 'spring')).toEqual([]);
  });

  it('spawns at half the rate after the halving', () => {
    const cfg = quietConfig({ coinSpawnPerSecond: 2, maxFieldCoins: 10_000 });
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    runTo(m, 200_000);
    const before = m.state.stats.spawned;
    runTo(m, 220_000); // 20 s before the halving
    const rateBefore = m.state.stats.spawned - before;
    runTo(m, 230_000);
    const after = m.state.stats.spawned;
    runTo(m, 250_000); // 20 s after it
    expect(rateBefore).toBe(40);
    expect(m.state.stats.spawned - after).toBe(20);
  });

  it('a ghost picks up a coin it touches', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    m.state.coins.push({ id: 99, x: g.x + 10, y: g.y, season: 'spring' });
    act(m, 1, { dx: 0, dy: 0 });
    expect(g.carried.spring).toBe(1);
    expect(m.state.coins).toEqual([]);
  });
});

describe('movement', () => {
  it('a carrier moves slower by the configured factor', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    const a = ghost(m, 1);
    const b = ghost(m, 2);
    a.x = 500;
    b.x = 500;
    b.carried.spring = 1;
    m.tick(
      1000,
      new Map([
        [1, { dx: 1, dy: 0 }],
        [2, { dx: 1, dy: 0 }],
      ]),
    );
    expect(a.x - 500).toBeCloseTo(cfg.ghostSpeed);
    expect(b.x - 500).toBeCloseTo(cfg.ghostSpeed * cfg.carrySpeedFactor);
  });

  it('clamps an oversized direction to unit speed and ignores NaN and Infinity', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    g.x = 500;
    g.y = 500;
    m.tick(1000, new Map([[1, { dx: 1e9, dy: 0 }]]));
    expect(g.x - 500).toBeCloseTo(cfg.ghostSpeed);
    m.tick(1000, new Map([[1, { dx: Number.NaN, dy: Infinity }]]));
    expect(g.x - 500).toBeCloseTo(cfg.ghostSpeed);
    expect(g.y).toBe(500);
  });

  it('never leaves the field', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    m.tick(60_000, new Map([[1, { dx: -1, dy: -1 }]]));
    expect(ghost(m, 1)).toMatchObject({ x: 0, y: 0 });
  });
});
