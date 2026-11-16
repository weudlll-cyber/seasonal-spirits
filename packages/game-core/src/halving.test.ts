// Seasonal Spirits — the halving at every season turn: the prices move on, field and carried
// coins stay, countdown and one-tick event each time; the match end is no halving but has its own
// countdown and one-tick event (owner decision 2026-11-16).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { valueNow } from './prices.js';
import { ghost, matchOf, quietConfig, runTo } from './test-helpers.js';
import type { MatchEvent } from './types.js';

const halvingsOf = (events: MatchEvent[]): Extract<MatchEvent, { type: 'halving' }>[] =>
  events.filter((e): e is Extract<MatchEvent, { type: 'halving' }> => e.type === 'halving');

describe('halving', () => {
  it('happens at 1:15, 2:30 and 3:45 with the new season, and not at the match end', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const seen: MatchEvent[] = [];
    while (!m.state.ended) seen.push(...m.tick(50, new Map()).events);
    expect(halvingsOf(seen).map((e) => [e.atMs, e.season])).toEqual([
      [75_000, 'summer'],
      [150_000, 'autumn'],
      [225_000, 'winter'],
    ]);
  });

  it('leaves carried coins untouched; their prices move on (4 / 2 / 1 → summer in season)', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    g.carried.spring = 3;
    g.carried.summer = 4;
    g.securedValue = 12;
    const before = valueNow(DEFAULT_CONFIG, g.carried, m.state.clock.current);
    runTo(m, 75_000);
    expect(g.carried).toEqual({ spring: 3, summer: 4, autumn: 0, winter: 0 });
    expect(g.securedValue).toBe(12);
    expect(before).toBe(3 * 4 + 4 * 2); // spring in season, summer next
    expect(valueNow(DEFAULT_CONFIG, g.carried, m.state.clock.current)).toBe(3 * 1 + 4 * 4);
  });

  it('keeps every field coin through the halving and spawns at the same rate', () => {
    const cfg = quietConfig({ coinSpawnPerSecond: 2, maxFieldCoins: 10_000 });
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    ghost(m, 1).x = 0; // in a corner, out of reach of almost every coin
    runTo(m, 55_000);
    const at55 = m.state.stats.spawned;
    runTo(m, 65_000);
    const tenSecondsBefore = m.state.stats.spawned - at55;
    runTo(m, 75_000 - 50);
    const onField = m.state.coins.map((c) => c.id);
    runTo(m, 75_000);
    expect(onField.length).toBeGreaterThan(0);
    const kept = new Set(m.state.coins.map((c) => c.id));
    expect(onField.every((id) => kept.has(id))).toBe(true);
    runTo(m, 85_000);
    const at85 = m.state.stats.spawned;
    runTo(m, 95_000);
    expect(tenSecondsBefore).toBe(20);
    expect(m.state.stats.spawned - at85).toBe(tenSecondsBefore);
  });
});

describe('halving countdown and event', () => {
  it('carries a 10 s countdown before every halving and before the match end, none after', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    for (const turn of [75_000, 150_000, 225_000, 300_000]) {
      runTo(m, turn - 11_000);
      expect(m.state.countdownMs, `before ${turn}`).toBeNull();
      runTo(m, turn - 9000);
      expect(m.state.countdownMs, `before ${turn}`).toBe(9000);
      runTo(m, turn);
      expect(m.state.countdownMs, `at ${turn}`).toBeNull();
    }
    expect(m.state.ended).toBe(true);
  });

  it('emits each HALVING event in exactly one tick, and the match end once at its end', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    let ticksWithHalving = 0;
    const ends: number[] = [];
    while (!m.state.ended) {
      const events = m.tick(50, new Map()).events;
      if (halvingsOf(events).length > 0) ticksWithHalving++;
      for (const e of events) if (e.type === 'match-end') ends.push(e.atMs);
    }
    m.tick(50, new Map()); // after the end nothing happens any more
    expect(m.state.events).toEqual([]);
    expect(ticksWithHalving).toBe(3);
    expect(ends).toEqual([300_000]);
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
