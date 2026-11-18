// Seasonal Sumo — the dash's wind-up (NIGHT 2026-11-18, piece 6; owner's option, off by default):
// off, the dash goes at the press as before; on, the ghost holds still for the wind-up in the
// direction of the press, then dashes; the cooldown runs from the press; a jump meanwhile drops
// the dash; a bot sees a rival's wind-up aimed at it as an attack.

import { describe, expect, it } from 'vitest';
import { underAttack } from './bots/bot.js';
import { configFrom, type GameConfig } from './config.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { cfg, ghost, matchOf, place } from './test-helpers.js';
import type { Intent } from './types.js';

const WIND: GameConfig = configFrom({ ...DEFAULT_SETTINGS, dashWindUp: 1 }, 'sumo');
const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];
const DASH: Intent = { dx: 1, dy: 0, action: 'dash' };
const UP: Intent = { dx: 0, dy: -1 }; // steering away from the dash's line while it winds up

// The ghost's speed and whether a dash event came, tick by tick, after a dash press.
function afterPress(c: GameConfig, then: Intent = UP, ticks = 5) {
  const m = matchOf(c, two);
  place(m, 1, -100, 0);
  place(m, 2, 200, 200);
  m.tick(50, new Map([[1, DASH]]));
  const steps = [{ vx: ghost(m, 1).vx, vy: ghost(m, 1).vy, dashed: dashed(m) }];
  for (let i = 1; i < ticks; i++) {
    m.tick(50, new Map([[1, then]]));
    steps.push({ vx: ghost(m, 1).vx, vy: ghost(m, 1).vy, dashed: dashed(m) });
  }
  return { m, steps };
}
const dashed = (m: ReturnType<typeof matchOf>) =>
  m.state.events.some((e) => e.type === 'dash' && e.ghost === 1);

describe('the dash wind-up', () => {
  it('is off by default: the dash goes at the press', () => {
    expect(cfg.dashWindUpMs).toBe(0);
    const { steps } = afterPress(cfg);
    expect(steps[0]?.dashed).toBe(true);
    expect(steps[0]?.vx).toBeGreaterThan(cfg.maxSpeed);
  });

  it('on, holds the ghost still for the wind-up, then dashes in the pressed direction', () => {
    expect(WIND.dashWindUpMs).toBe(120);
    const { steps } = afterPress(WIND);
    // Pressed at 50 ms, 120 ms long: held at 50, 100 and 150 ms, released on the first tick
    // past 170 ms (200 ms) — the core's time runs in ticks.
    for (const s of steps.slice(0, 3))
      expect([s.dashed, Math.hypot(s.vx, s.vy)]).toEqual([false, 0]);
    expect(steps[3]?.dashed).toBe(true);
    expect(steps[3]?.vx).toBeGreaterThan(WIND.maxSpeed); // along +x, not where it steered
    expect(Math.abs(steps[3]?.vy ?? Infinity)).toBeLessThan((steps[3]?.vx ?? 0) / 4);
  });

  it('runs the cooldown from the press: pressing again during the wind-up does nothing', () => {
    const { m } = afterPress(WIND, DASH);
    expect(ghost(m, 1).dashReadyMs).toBe(50 + WIND.dashCooldownMs);
  });

  it('drops the dash when the ghost jumps during the wind-up', () => {
    const { steps } = afterPress(WIND, { dx: 0, dy: 0, action: 'jump' });
    expect(steps.some((s) => s.dashed)).toBe(false);
  });

  it('is an attack a bot can see: a rival winding up at it, in range', () => {
    const m = matchOf(WIND, two);
    place(m, 1, -100, 0);
    place(m, 2, 0, 0);
    m.tick(50, new Map([[1, DASH]]));
    expect(underAttack(WIND, m.state, ghost(m, 2))).toBe(true);
    place(m, 2, 0, 150); // off its line
    expect(underAttack(WIND, m.state, ghost(m, 2))).toBe(false);
  });
});
