// Seasonal Spirits — soft separation: stacked ghosts part, stay in the field, can still steal.
// Owner decision 2026-11-15 ("ghosts softly push each other apart").

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { distance } from './geometry.js';
import { act, ghost, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';

const pair = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];

describe('soft separation', () => {
  it('parts two ghosts on the same point within a few ticks', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, pair);
    const [a, b] = [ghost(m, 1), ghost(m, 2)];
    Object.assign(a, { x: 1000, y: 1000 });
    Object.assign(b, { x: 1000, y: 1000 });
    runTo(m, 10 * 50);
    expect(distance(a, b)).toBeGreaterThan(cfg.separationRadius * 0.9);
  });

  it('never pushes a ghost out of the field', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, pair);
    const [a, b] = [ghost(m, 1), ghost(m, 2)];
    Object.assign(a, { x: 0, y: 0 });
    Object.assign(b, { x: 1, y: 1 });
    runTo(m, 20 * 50);
    for (const g of [a, b]) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeGreaterThanOrEqual(0);
    }
    expect(distance(a, b)).toBeGreaterThan(cfg.separationRadius * 0.9);
  });

  it('never moves a ghost while it secures; its neighbour takes the whole push', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, pair);
    const a = placeAtShrine(m, 1);
    a.carried.spring = 3;
    const b = ghost(m, 2);
    Object.assign(b, { x: a.x + 5, y: a.y });
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    const at = { x: a.x, y: a.y };
    runTo(m, 1000);
    expect({ x: a.x, y: a.y }).toEqual(at);
    expect(distance(a, b)).toBeGreaterThan(cfg.separationRadius * 0.9);
  });

  it('keeps a thief beside a carrier in steal range', () => {
    expect(DEFAULT_CONFIG.stealRange).toBeGreaterThan(DEFAULT_CONFIG.separationRadius);
    const cfg = quietConfig();
    const m = matchOf(cfg, pair);
    const [thief, carrier] = [ghost(m, 1), ghost(m, 2)];
    Object.assign(thief, { x: 1000, y: 1000 });
    Object.assign(carrier, { x: 1000, y: 1000 });
    carrier.carried.spring = 4;
    runTo(m, 40 * 50); // fully parted
    act(m, 1, { dx: 0, dy: 0, action: 'steal' });
    expect(thief.carried.spring).toBe(2);
  });

  // Same seed, same match: simulation.test.ts "is identical for the same seed …" plays whole
  // matches, separation included.
});
