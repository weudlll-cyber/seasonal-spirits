// Seasonal Sumo — the halving at every season turn: the arena's area halves and its edge eases
// in; the countdown and the one-tick event each time; the match end is no halving but has its
// own countdown and one-tick event.

import { describe, expect, it } from 'vitest';
import { nextRadius } from './arena.js';
import { cfg, matchOf, runTo } from './test-helpers.js';
import type { MatchEvent } from './types.js';

const halvingsOf = (events: MatchEvent[]): Extract<MatchEvent, { type: 'halving' }>[] =>
  events.filter((e): e is Extract<MatchEvent, { type: 'halving' }> => e.type === 'halving');

const one = [{ id: 1, team: 0 as const }];

describe('halving', () => {
  it('happens at 1:15, 2:30 and 3:45 with the new season, and halves the arena each time', () => {
    const m = matchOf(cfg, one);
    const seen: MatchEvent[] = [];
    while (!m.state.ended) seen.push(...m.tick(50, new Map()).events);
    const r = cfg.arenaRadius;
    expect(halvingsOf(seen).map((e) => [e.atMs, e.season])).toEqual([
      [75_000, 'summer'],
      [150_000, 'autumn'],
      [225_000, 'winter'],
    ]);
    halvingsOf(seen).forEach((e, k) => {
      // Area × ½ each time: radius × 1/√2.
      expect(e.radius).toBeCloseTo(r * Math.SQRT1_2 ** (k + 1), 6);
    });
  });

  it('eases the edge in over arenaShrinkMs, and shows the next edge before it', () => {
    const m = matchOf(cfg, one);
    const r = cfg.arenaRadius;
    expect(nextRadius(m.state.arena)).toBeCloseTo(r * Math.SQRT1_2, 6);
    runTo(m, 75_000);
    expect(m.state.arena.radius).toBeGreaterThan(r * 0.99);
    runTo(m, 75_000 + cfg.arenaShrinkMs / 2);
    const mid = m.state.arena.radius;
    expect(mid).toBeLessThan(r * 0.9);
    expect(mid).toBeGreaterThan(r * Math.SQRT1_2 * 1.05);
    runTo(m, 75_000 + cfg.arenaShrinkMs);
    expect(m.state.arena.radius).toBeCloseTo(r * Math.SQRT1_2, 6);
  });
});

describe('countdown and events', () => {
  it('carries a 10 s countdown before every halving and before the match end, none after', () => {
    const m = matchOf(cfg, one);
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

  it('emits each halving in exactly one tick, the match end once, and nothing after it', () => {
    const m = matchOf(cfg, one);
    let ticksWithHalving = 0;
    const ends: number[] = [];
    while (!m.state.ended) {
      const events = m.tick(50, new Map()).events;
      if (halvingsOf(events).length > 0) ticksWithHalving++;
      for (const e of events) if (e.type === 'match-end') ends.push(e.atMs);
    }
    m.tick(50, new Map());
    expect(m.state.events).toEqual([]);
    expect(ticksWithHalving).toBe(3);
    expect(ends).toEqual([300_000]);
  });
});
