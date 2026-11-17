// Seasonal Sumo — the physics: running with momentum and a top speed, the dash and its
// cooldown (the core's, whatever a client sends), the knock of a dash, the team in season
// pushing harder, the field's bounds, the walls of hill and bomb, and bad input.

import { describe, expect, it } from 'vitest';
import { modeConfig } from './config.js';
import { stepGhost } from './geometry.js';
import { act, cfg, ghost, matchOf, place, runTo } from './test-helpers.js';

const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];

describe('running', () => {
  it('speeds up with momentum to the top speed and never past it by running', () => {
    let m = { x: 100, y: 1000, vx: 0, vy: 0 }; // room for 5 s at top speed
    m = stepGhost(cfg, m, { dx: 1, dy: 0 }, 50);
    expect(m.vx).toBeGreaterThan(0);
    expect(m.vx).toBeLessThan(cfg.maxSpeed / 2);
    for (let i = 0; i < 100; i++) m = stepGhost(cfg, m, { dx: 1, dy: 0 }, 50);
    expect(m.vx).toBeLessThanOrEqual(cfg.maxSpeed);
    expect(m.vx).toBeGreaterThan(cfg.maxSpeed * 0.8);
  });

  it('slides on and slows down by friction when the direction is let go', () => {
    let m = { x: 1000, y: 1000, vx: 300, vy: 0 };
    for (let i = 0; i < 20; i++) m = stepGhost(cfg, m, { dx: 0, dy: 0 }, 50); // one second
    expect(m.x).toBeGreaterThan(1050);
    expect(m.vx).toBeCloseTo(300 * Math.exp(-cfg.friction), 5);
  });

  it('clamps an oversized direction to unit speed and ignores NaN and Infinity', () => {
    const big = stepGhost(cfg, { x: 1000, y: 1000, vx: 0, vy: 0 }, { dx: 50, dy: 0 }, 50);
    const unit = stepGhost(cfg, { x: 1000, y: 1000, vx: 0, vy: 0 }, { dx: 1, dy: 0 }, 50);
    expect(big).toEqual(unit);
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(stepGhost(cfg, { x: 1000, y: 1000, vx: 0, vy: 0 }, { dx: bad, dy: 0 }, 50)).toEqual({
        x: 1000,
        y: 1000,
        vx: 0,
        vy: 0,
      });
    }
  });

  it('never leaves the field', () => {
    const m = stepGhost(cfg, { x: 1, y: 1999, vx: -5000, vy: 5000 }, { dx: 0, dy: 0 }, 1000);
    expect(m.x).toBe(0);
    expect(m.y).toBe(cfg.fieldSize);
  });

  it('stops at a wall in the walled modes, keeping its speed along the wall', () => {
    const walls = modeConfig(cfg, 'hill');
    const edge = cfg.fieldSize / 2 + walls.wallHalf - walls.ghostRadius;
    const m = stepGhost(walls, { x: edge - 5, y: 1000, vx: 600, vy: 200 }, { dx: 1, dy: 0 }, 50);
    expect(m.x).toBe(edge);
    expect(m.vx).toBe(0);
    expect(m.vy).toBeGreaterThan(0);
  });
});

describe('dash', () => {
  it('bursts to dashSpeed towards the held direction', () => {
    const m = matchOf(cfg, two);
    place(m, 1, 0, 0);
    act(m, 1, { dx: 0, dy: -1, action: 'dash' });
    const g = ghost(m, 1);
    expect(-g.vy).toBeGreaterThan(cfg.maxSpeed * 2);
    expect(m.state.events).toContainEqual({ type: 'dash', ghost: 1 });
  });

  it('waits for the cooldown, however often a client asks', () => {
    const m = matchOf(cfg, two);
    place(m, 1, 0, 0);
    act(m, 1, { dx: 1, dy: 0, action: 'dash' });
    let dashes = 0;
    while (m.state.elapsedMs < cfg.dashCooldownMs - 50) {
      act(m, 1, { dx: 1, dy: 0, action: 'dash' });
      dashes += m.state.events.filter((e) => e.type === 'dash').length;
    }
    expect(dashes).toBe(0);
    place(m, 1, 0, 0);
    act(m, 1, { dx: 1, dy: 0, action: 'dash' });
    act(m, 1, { dx: 1, dy: 0, action: 'dash' });
    expect(ghost(m, 1).dashReadyMs).toBeGreaterThan(m.state.elapsedMs);
  });

  it('knocks the ghost it hits away hard; a plain bump far less', () => {
    const knock = (dash: boolean): number => {
      const m = matchOf(cfg, two);
      place(m, 1, -60, 0);
      place(m, 2, 0, 0);
      for (let i = 0; i < 6; i++)
        act(m, 1, dash ? { dx: 1, dy: 0, action: 'dash' } : { dx: 1, dy: 0 });
      return ghost(m, 2).vx;
    };
    expect(knock(true)).toBeGreaterThan(cfg.knockSpeed * 0.8);
    expect(knock(true)).toBeGreaterThan(knock(false) * 2);
  });

  it('pushes harder for the team in season (Spring in spring)', () => {
    const shove = (team: 0 | 2): number => {
      const m = matchOf(cfg, [
        { id: 1, team },
        { id: 2, team: 1 },
      ]);
      place(m, 1, -31, 0);
      place(m, 2, 0, 0);
      ghost(m, 1).vx = 300;
      m.tick(50, new Map());
      return ghost(m, 2).vx;
    };
    expect(shove(0) / shove(2)).toBeGreaterThan(1.1);
  });
});

describe('protection after a respawn', () => {
  it('is neither pushed nor pushes', () => {
    const m = matchOf(cfg, two);
    place(m, 1, -60, 0);
    place(m, 2, 0, 0);
    ghost(m, 2).protectedUntilMs = 10_000;
    for (let i = 0; i < 6; i++) act(m, 1, { dx: 1, dy: 0, action: 'dash' });
    expect(ghost(m, 2).vx).toBe(0);
    expect(ghost(m, 2).lastTouch).toBeNull();
    runTo(m, 0);
  });
});
