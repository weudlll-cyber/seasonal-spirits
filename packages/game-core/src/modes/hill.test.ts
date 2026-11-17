// Seasonal Sumo — "King of the Season": a point per second in the zone for the ghost and its
// team, the zone's jump and halving at every halving (shown before it), the bounce credit.

import { describe, expect, it } from 'vitest';
import { modeConfig } from '../config.js';
import { cfg as base, ghost, matchOf, runTo } from '../test-helpers.js';
import { areaOf } from './rules.js';

const cfg = modeConfig(base, 'hill');
const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];

function standAt(m: ReturnType<typeof matchOf>, id: number, x: number, y: number): void {
  Object.assign(ghost(m, id), { x, y, vx: 0, vy: 0 });
}

describe('hill scoring', () => {
  it('earns a point per second inside the zone, for the ghost and its team; none outside', () => {
    const m = matchOf(cfg, two);
    const z = m.state.zone;
    if (!z) throw new Error('no zone');
    standAt(m, 1, z.x, z.y);
    standAt(m, 2, 2 * m.state.arena.centre.x - z.x, 2 * m.state.arena.centre.y - z.y);
    runTo(m, 10_000);
    const r = m.result();
    expect(r.players.map((p) => [p.id, p.score])).toEqual([
      [1, 10],
      [2, 0],
    ]);
    expect(r.teams).toEqual([10, 0, 0, 0]);
  });

  it('credits a bounce to the opponent that touched a ghost just before it left the zone', () => {
    const m = matchOf(cfg, two);
    const z = m.state.zone;
    if (!z) throw new Error('no zone');
    standAt(m, 1, z.x, z.y);
    runTo(m, 1000);
    // Pushed out right after ghost 2's touch: a bounce for 2.
    Object.assign(ghost(m, 1), { x: z.x + z.r + 50, lastTouch: { by: 2, atMs: 950 } });
    runTo(m, 1050);
    expect(ghost(m, 2).bounces).toBe(1);
    // Walking out long after a touch is nobody's bounce.
    standAt(m, 1, z.x, z.y);
    runTo(m, 5000);
    Object.assign(ghost(m, 1), { x: z.x + z.r + 50, lastTouch: { by: 2, atMs: 1000 } });
    runTo(m, 5050);
    expect(ghost(m, 2).bounces).toBe(1);
  });
});

describe('hill zone', () => {
  it('jumps to the new season’s quarter at every halving and halves its area, shown before', () => {
    const m = matchOf(cfg, two);
    const c = m.state.arena.centre;
    const start = m.state.zone;
    if (!start) throw new Error('no zone');
    // Spring's quarter: top left.
    expect([start.x < c.x, start.y < c.y, start.r]).toEqual([true, true, cfg.hill.zoneRadius]);
    runTo(m, 40_000);
    const shown = areaOf(cfg, m.state).next;
    runTo(m, 45_000);
    const z = areaOf(cfg, m.state).now;
    if (!z) throw new Error('no zone');
    // Summer's quarter: top right; the area halved; the dashed outline showed exactly it.
    expect([z.x > c.x, z.y < c.y]).toEqual([true, true]);
    expect(z.r).toBeCloseTo(cfg.hill.zoneRadius * Math.SQRT1_2, 6);
    expect(shown).toEqual(z);
  });

  it('has walls: a ghost pushed far beyond them stays inside and never falls', () => {
    const m = matchOf(cfg, two);
    Object.assign(ghost(m, 2), { x: 0, y: 0, vx: -2000, vy: -2000 });
    runTo(m, 2000);
    const g = ghost(m, 2);
    expect(g.phase).toBe('in');
    expect(g.falls).toBe(0);
    expect(g.x).toBe(cfg.fieldSize / 2 - cfg.wallHalf + cfg.ghostRadius);
  });
});
