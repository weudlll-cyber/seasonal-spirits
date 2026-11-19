// Seasonal Sumo — the walls of King and Halving Bomb closing in at each halving (owner's decision
// 2026-11-19): the half side × the factor, never below the smallest field; every ghost outside
// the new walls is pushed in with them — nobody falls, scores or is stunned by it; the King zone
// jumps into its quarter of the smaller field and fits it; with the switch off nothing moves.

import { describe, expect, it } from 'vitest';
import { quarterCentre } from './arena.js';
import { configFrom, type GameConfig, type GameMode } from './config.js';
import { DEFAULT_SETTINGS, type Settings } from './settings.js';
import { simulate } from './simulation.js';
import { ghost, matchOf, place, runTo } from './test-helpers.js';
import { areaOf } from './modes/rules.js';
import type { MatchState, Team } from './types.js';

const roster = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];

function cfgOf(mode: GameMode, more: Partial<Settings> = {}): GameConfig {
  return configFrom({ ...DEFAULT_SETTINGS, ...more }, mode);
}

// The walls' half side right after each halving of a whole match, nobody acting.
function targets(c: GameConfig): number[] {
  const m = matchOf(c, roster);
  const out: number[] = [];
  while (!m.state.ended) {
    const s = m.tick(50, new Map());
    if (s.events.some((e) => e.type === 'halving')) out.push(s.arena.target);
  }
  return out;
}

describe('walls closing in', () => {
  it.each(['hill', 'bomb'] as const)(
    '%s: the half side × the factor at each halving, never below the smallest field',
    (mode) => {
      const c = cfgOf(mode);
      const half = c.wallHalf;
      const { factor, smallest } = c.walls;
      const want: number[] = [];
      for (let h = half, k = 0; k < targets(c).length; k++) {
        h = Math.min(h, Math.max(smallest, h * factor));
        want.push(h);
      }
      expect(want.length).toBeGreaterThan(1);
      expect(targets(c)).toEqual(want);
      expect(Math.min(...want)).toBeGreaterThanOrEqual(smallest);
    },
  );

  it('pushes a ghost outside the new walls in with them: no fall, no credit, no stun', () => {
    const c = cfgOf('hill');
    const m = matchOf(c, roster);
    const half = c.wallHalf - c.ghostRadius; // standing at the wall, in a corner
    const g = place(m, 1, half, half);
    runTo(m, c.seasonDurationMs + c.arenaShrinkMs + 100);
    const s = m.state;
    const reach = s.arena.radius - c.ghostRadius;
    expect(s.arena.radius).toBeLessThan(c.wallHalf);
    expect(g.x - s.arena.centre.x).toBeCloseTo(reach, 6);
    expect(g.y - s.arena.centre.y).toBeCloseTo(reach, 6);
    expect([g.phase, g.falls, g.lastTouch, g.knockedUntilMs]).toEqual(['in', 0, null, 0]);
    expect(ghost(m, 2).knockouts).toBe(0);
  });

  it('moves the walls in smoothly, eased over the edge easing time', () => {
    const c = cfgOf('bomb');
    const m = matchOf(c, roster);
    runTo(m, c.seasonDurationMs);
    const radii: number[] = [];
    for (let t = 0; t <= c.arenaShrinkMs; t += 50) {
      runTo(m, c.seasonDurationMs + t);
      radii.push(m.state.arena.radius);
    }
    const steps = radii.slice(1).map((r, i) => (radii[i] ?? r) - r);
    expect(steps.every((d) => d >= 0)).toBe(true);
    expect(Math.max(...steps)).toBeLessThan((c.wallHalf * (1 - c.walls.factor)) / 10);
    expect(radii.at(-1)).toBeCloseTo(c.wallHalf * c.walls.factor, 6);
  });
});

describe('the King zone in closing walls', () => {
  it('jumps the King zone into its quarter of the smaller field, fitting it, shown before', () => {
    const c = cfgOf('hill', { hillWall: 400, zoneRadius: 300, zoneShrink: 1 });
    const m = matchOf(c, roster);
    // Inside the walls the zone's disc reaches no further than half the side from the middle.
    const fits = (s: Readonly<MatchState>): boolean => {
      const z = s.zone;
      const { x, y } = s.arena.centre;
      const far = z ? Math.max(Math.abs(z.x - x), Math.abs(z.y - y)) + z.r : Infinity;
      return far <= s.arena.target + 1e-9;
    };
    expect(m.state.zone?.r).toBe(200); // 300 would reach past its quarter of 400
    expect(fits(m.state)).toBe(true);
    for (let k = 1; k <= 3; k++) {
      runTo(m, k * c.seasonDurationMs - 1000);
      const shown = areaOf(c, m.state).next;
      runTo(m, k * c.seasonDurationMs + 100);
      const s = m.state;
      const q = quarterCentre(s.arena.centre, s.arena.target, (k % 4) as Team);
      expect([s.zone?.x, s.zone?.y]).toEqual([q.x, q.y]);
      expect(s.zone?.r).toBeCloseTo(s.arena.target / 2, 6);
      expect(fits(s)).toBe(true);
      expect(shown).toEqual(s.zone);
    }
  });
});

describe('walls closing in, whole bot matches', () => {
  it.each(['hill', 'bomb'] as const)(
    '%s with the switch off: the walls never move, the same seed gives the same match',
    (mode) => {
      const field = mode === 'hill' ? { hillClose: 0 } : { bombClose: 0 };
      const quick = mode === 'hill' ? { hillMatch: 60, hillJump: 15 } : { bombMatch: 60 };
      const c = cfgOf(mode, { ...field, ...quick });
      const radii = new Set<number>();
      const a = simulate(c, 3, undefined, (s) => radii.add(s.arena.radius));
      const b = simulate(c, 3);
      expect([...radii]).toEqual([c.wallHalf]);
      expect(a.result).toEqual(b.result);
    },
  );

  it.each(['hill', 'bomb'] as const)(
    '%s with the walls closing: nobody falls in a bot match',
    (mode) => {
      const quick = mode === 'hill' ? { hillMatch: 60, hillJump: 15 } : { bombMatch: 60 };
      const r = simulate(cfgOf(mode, quick), 5);
      expect(r.sanity.filter((x) => !x.ok)).toEqual([]);
      expect(r.result.players.every((p) => p.falls === 0)).toBe(true);
    },
  );
});
