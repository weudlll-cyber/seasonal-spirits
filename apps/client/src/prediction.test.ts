// Seasonal Sumo — the own ghost's prediction (prediction.ts): it moves as the server moves for
// the same inputs — momentum, top speed, a dash —, fades a small gap to the server's word,
// snaps across a large one, and stands while the server holds the ghost still.

import { DEFAULT_CONFIG, Match, type Intent } from '@seasonal-spirits/game-core';
import { describe, expect, it } from 'vitest';
import { OwnPrediction, PREDICTION_LAG_MS, SNAP_DISTANCE, type ServerOwn } from './prediction.js';

const TICK = 50;
const at = (x: number, y: number, receivedAt: number, frozen = false): ServerOwn => ({
  x,
  y,
  vx: 0,
  vy: 0,
  dashLeftMs: 0,
  frozen,
  receivedAt,
});

describe('OwnPrediction against the server', () => {
  it('moves exactly as the server does for the same inputs: momentum, top speed, a dash', () => {
    const match = new Match(DEFAULT_CONFIG, 7, [{ id: 0, team: 0 }]);
    const ghost = match.state.ghosts[0];
    if (!ghost) throw new Error('no ghost');
    const p = new OwnPrediction(DEFAULT_CONFIG);
    // Towards the middle of the arena, a dash downwards, then on down.
    const intents: Intent[] = [
      ...Array.from({ length: 20 }, () => ({ dx: 1, dy: 0 })),
      { dx: 0, dy: 1, action: 'dash' },
      ...Array.from({ length: 20 }, () => ({ dx: 0, dy: 1 })),
    ];
    const server = (k: number): ServerOwn => ({
      x: ghost.x,
      y: ghost.y,
      vx: ghost.vx,
      vy: ghost.vy,
      dashLeftMs: Math.max(0, ghost.dashReadyMs - match.state.elapsedMs),
      frozen: false,
      receivedAt: k * TICK + PREDICTION_LAG_MS, // the state after tick k arrives then
    });
    let seen = server(0);
    p.update(0, { dx: 0, dy: 0 }, seen);
    intents.forEach((intent, i) => {
      const k = i + 1;
      match.tick(TICK, new Map([[0, intent]]));
      // The frame at the end of tick k holds the direction the tick applied and knows the
      // state of tick k - 1.
      const shown = p.update(k * TICK, intent, seen, intent.action === 'dash');
      expect(shown?.x).toBeCloseTo(ghost.x, 6);
      expect(shown?.y).toBeCloseTo(ghost.y, 6);
      seen = server(k);
    });
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

  it('snaps to the server across a gap above the snap distance (a respawn, a knock)', () => {
    const p = new OwnPrediction();
    const still = { dx: 0, dy: 0 };
    p.update(0, still, at(500, 500, 0));
    const shown = p.update(16, still, at(500 + SNAP_DISTANCE + 50, 500, 16));
    expect(shown).toEqual({ x: 500 + SNAP_DISTANCE + 50, y: 500 });
  });

  it('stands while the server holds the ghost (falling, out, the result), whatever is held', () => {
    const p = new OwnPrediction();
    p.update(0, { dx: 1, dy: 0 }, at(500, 500, 0, true));
    let shown = null;
    for (let t = 16; t <= 1000; t += 16)
      shown = p.update(t, { dx: 1, dy: 0 }, at(500, 500, t, true));
    expect(shown).toEqual({ x: 500, y: 500 });
  });
});
