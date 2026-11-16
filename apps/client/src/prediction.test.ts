// Seasonal Spirits — the own ghost's prediction (prediction.ts): it moves as the server moves
// for the same inputs, fades a small gap to the server's word, snaps across a large one, and
// stands while the server holds the ghost still.

import { DEFAULT_CONFIG, Match, totalCount } from '@seasonal-spirits/game-core';
import { describe, expect, it } from 'vitest';
import { OwnPrediction, PREDICTION_LAG_MS, SNAP_DISTANCE, type ServerOwn } from './prediction.js';

const TICK = 50;
const at = (x: number, y: number, receivedAt: number, frozen = false): ServerOwn => ({
  x,
  y,
  carrying: false,
  frozen,
  receivedAt,
});

describe('OwnPrediction against the server', () => {
  it('moves exactly as the server does for the same inputs: speed, carrying, the field edge', () => {
    const cfg = { ...DEFAULT_CONFIG, coinSpawnPerSecond: 0 };
    const match = new Match(cfg, 7, [{ id: 0, team: 0 }]);
    const ghost = match.state.ghosts[0];
    if (!ghost) throw new Error('no ghost');
    const p = new OwnPrediction(cfg);
    // Towards the corner past the field edge, then diagonally out while carrying.
    const dirs = [
      ...Array.from({ length: 30 }, () => ({ dx: -1, dy: -1 })),
      ...Array.from({ length: 30 }, () => ({ dx: 0.6, dy: 0.8 })),
    ];
    const server = (k: number): ServerOwn => ({
      x: ghost.x,
      y: ghost.y,
      carrying: totalCount(ghost.carried) > 0,
      frozen: false,
      receivedAt: k * TICK + PREDICTION_LAG_MS, // the state after tick k arrives then
    });
    let seen = server(0);
    p.update(0, { dx: 0, dy: 0 }, seen);
    dirs.forEach((dir, i) => {
      const k = i + 1;
      match.tick(TICK, new Map([[0, dir]]));
      // The frame at the end of tick k holds the direction the tick applied and knows the
      // state of tick k - 1.
      const shown = p.update(k * TICK, dir, seen);
      expect(shown?.x).toBeCloseTo(ghost.x, 9);
      expect(shown?.y).toBeCloseTo(ghost.y, 9);
      if (k === 30) ghost.carried.spring = 3; // carrying from tick 31 on: slower
      seen = server(k);
    });
    expect(Math.min(ghost.x, ghost.y)).toBeGreaterThan(0); // it left the corner again
  });
});

describe('OwnPrediction against a gap', () => {
  it('closes a small gap to the server smoothly, not in one jump', () => {
    const p = new OwnPrediction();
    const still = { dx: 0, dy: 0 };
    p.update(0, still, at(500, 500, 0));
    const first = p.update(16, still, at(520, 500, 16));
    expect(first?.x).toBeGreaterThan(500);
    expect(first?.x).toBeLessThan(510);
    let shown = first;
    for (let t = 32; t <= 2000; t += 16) shown = p.update(t, still, at(520, 500, t));
    expect(shown?.x).toBeCloseTo(520, 1);
  });

  it('snaps to the server across a gap above the snap distance (a new match)', () => {
    const p = new OwnPrediction();
    const still = { dx: 0, dy: 0 };
    p.update(0, still, at(500, 500, 0));
    const shown = p.update(16, still, at(500 + SNAP_DISTANCE + 50, 500, 16));
    expect(shown).toEqual({ x: 500 + SNAP_DISTANCE + 50, y: 500 });
  });

  it('stands while the server holds the ghost (securing, the result), whatever is held', () => {
    const p = new OwnPrediction();
    p.update(0, { dx: 1, dy: 0 }, at(500, 500, 0, true));
    let shown = null;
    for (let t = 16; t <= 1000; t += 16)
      shown = p.update(t, { dx: 1, dy: 0 }, at(500, 500, t, true));
    expect(shown).toEqual({ x: 500, y: 500 });
  });
});
