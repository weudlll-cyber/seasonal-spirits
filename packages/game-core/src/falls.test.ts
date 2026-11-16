// Seasonal Sumo — falling off: the centre past the edge falls; the credit goes to the last
// opponent that touched within creditMs, to nobody after that and never to a teammate; out
// for the fall time, then a respawn on the own team's quarter, protected; a halving that
// shrinks the edge under a ghost makes it fall too.

import { describe, expect, it } from 'vitest';
import { distance } from './geometry.js';
import { act, cfg, ghost, matchOf, place, runTo } from './test-helpers.js';

const pair = (b: 0 | 1) => [
  { id: 1, team: 0 as const },
  { id: 2, team: b },
];

// Ghost 2 (`team`) stands just inside the right edge, ghost 1 (Spring) dashes into it from
// the left.
function shove(team: 0 | 1) {
  const m = matchOf(cfg, pair(team));
  const r = cfg.arenaRadius;
  place(m, 1, r - 80, 0);
  place(m, 2, r - 20, 0);
  for (let i = 0; i < 20 && ghost(m, 2).phase === 'in'; i++) {
    act(m, 1, { dx: 1, dy: 0, action: 'dash' });
  }
  return m;
}

describe('falls and credit', () => {
  it('a ghost pushed past the edge falls and the pusher scores, with its team', () => {
    const m = shove(1);
    expect(ghost(m, 2).phase).toBe('falling');
    expect(ghost(m, 2).falls).toBe(1);
    expect(ghost(m, 1).knockouts).toBe(1);
    expect(m.result().teams).toEqual([1, 0, 0, 0]);
  });

  it('gives no credit for a fall after the credit time has run out', () => {
    const m = matchOf(cfg, pair(1));
    const g = place(m, 2, 0, 0);
    g.lastTouch = { by: 1, atMs: 0 };
    runTo(m, cfg.creditMs + 100);
    Object.assign(g, { x: m.state.arena.centre.x + cfg.arenaRadius + 5 });
    m.tick(50, new Map());
    expect(g.phase).toBe('falling');
    expect(ghost(m, 1).knockouts).toBe(0);
    expect(m.state.events).toContainEqual({
      type: 'fall',
      ghost: 2,
      by: null,
      atMs: m.state.elapsedMs,
    });
  });

  it('never credits a teammate', () => {
    const m = shove(0);
    expect(ghost(m, 2).phase).not.toBe('in');
    expect(ghost(m, 1).knockouts).toBe(0);
  });
});

describe('respawn', () => {
  it('is out for outMs, then back on its own quarter, protected for protectMs', () => {
    const m = shove(1);
    const fellAt = m.state.elapsedMs;
    runTo(m, fellAt + cfg.fallMs + 50);
    expect(ghost(m, 2).phase).toBe('out');
    runTo(m, fellAt + cfg.outMs - 50);
    expect(ghost(m, 2).phase).toBe('out');
    runTo(m, fellAt + cfg.outMs + 50);
    const g = ghost(m, 2);
    expect(g.phase).toBe('in');
    expect(g.protectedUntilMs).toBeGreaterThan(m.state.elapsedMs);
    expect(g.protectedUntilMs - m.state.elapsedMs).toBeLessThanOrEqual(cfg.protectMs);
    // Team 1 (Summer): the top right quarter.
    expect(g.x).toBeGreaterThan(m.state.arena.centre.x);
    expect(g.y).toBeLessThan(m.state.arena.centre.y);
    expect(distance(g, m.state.arena.centre)).toBeLessThan(m.state.arena.radius);
  });

  it('a halving that pulls the edge in under a ghost makes it fall', () => {
    const m = matchOf(cfg, pair(1));
    const g = place(m, 2, cfg.arenaRadius - 40, 0);
    runTo(m, 75_000 + cfg.arenaShrinkMs);
    expect(g.falls).toBe(1);
  });
});
