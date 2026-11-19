// Seasonal Sumo — "King of the Season": a point per second in the zone for the ghost and its
// team, the zone's jump and halving at every halving (shown before it), the bounce credit.

import { describe, expect, it } from 'vitest';
import { ghost, matchOf, modeCfg, runTo } from '../test-helpers.js';
import { quarterCentre } from '../arena.js';
import { areaOf } from './rules.js';

const cfg = modeCfg('hill');
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

  it('credits a bounce to the opponent whose dash put a ghost out of the zone just before', () => {
    const m = matchOf(cfg, two);
    const z = m.state.zone;
    if (!z) throw new Error('no zone');
    standAt(m, 1, z.x, z.y);
    runTo(m, 1000);
    // Out right after ghost 2's dash hit: a bounce for 2.
    const hit = { by: 2, atMs: 950, dash: true };
    Object.assign(ghost(m, 1), { x: z.x + z.r + 50, lastTouch: hit });
    runTo(m, 1050);
    expect(ghost(m, 2).bounces).toBe(1);
    // Walking out long after a dash hit is nobody's bounce.
    standAt(m, 1, z.x, z.y);
    runTo(m, 5000);
    Object.assign(ghost(m, 1), { x: z.x + z.r + 50, lastTouch: { ...hit, atMs: 1000 } });
    runTo(m, 5050);
    expect(ghost(m, 2).bounces).toBe(1);
  });

  // NIGHT 2026-11-18: "Bouncer" counted any touch; only the bouncer's own dash counts now.
  it('gives no bounce for a plain push out of the zone, without a dash', () => {
    const m = matchOf(cfg, two);
    const z = m.state.zone;
    if (!z) throw new Error('no zone');
    standAt(m, 1, z.x, z.y);
    runTo(m, 1000);
    const push = { by: 2, atMs: 950, dash: false };
    Object.assign(ghost(m, 1), { x: z.x + z.r + 50, lastTouch: push });
    runTo(m, 1050);
    expect(ghost(m, 2).bounces).toBe(0);
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
    expect(z.r).toBeCloseTo(cfg.hill.zoneRadius * cfg.hill.shrink, 6);
    expect(shown).toEqual(z);
  });

  // Owner's defaults 2026-11-19 (half side 450, zone 225): the zone at its starting size fits
  // its quarter exactly — each quarter's middle ± the radius stays inside the walls.
  it('fits the zone at its starting size into every quarter of the walls', () => {
    const m = matchOf(cfg, two);
    const c = m.state.arena.centre;
    const lo = c.x - cfg.wallHalf;
    const hi = c.x + cfg.wallHalf;
    for (const team of [0, 1, 2, 3] as const) {
      const q = quarterCentre(c, cfg.wallHalf, team);
      const r = cfg.hill.zoneRadius;
      expect(Math.min(q.x - r, q.y - r)).toBeGreaterThanOrEqual(lo);
      expect(Math.max(q.x + r, q.y + r)).toBeLessThanOrEqual(hi);
    }
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
