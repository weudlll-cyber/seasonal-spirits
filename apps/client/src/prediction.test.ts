// Seasonal Sumo — the own ghost's prediction (prediction.ts): it moves as the server moves for
// the same inputs — momentum, top speed, a dash —, fades a small gap to the server's word,
// snaps across a large one, stands while the server holds the ghost still, and stops at another
// ghost instead of being drawn through it.

import {
  DEFAULT_CONFIG,
  Match,
  DEFAULT_SETTINGS,
  configFrom,
  type Intent,
} from '@seasonal-spirits/game-core';
import { clientConfig } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';
import { OwnPrediction, PREDICTION_LAG_MS, SNAP_DISTANCE, type ServerOwn } from './prediction.js';

const TICK = 50;
const at = (x: number, y: number, receivedAt: number, frozen = false): ServerOwn => ({
  x,
  y,
  vx: 0,
  vy: 0,
  dashLeftMs: 0,
  jumpLeftMs: 0,
  airborne: false,
  frozen,
  receivedAt,
});

// Changed settings (the admin panel, NIGHT 2026-11-18): the server builds its config from them,
// the client the same from the tuning message (render clientConfig).
const TUNING = {
  ...DEFAULT_SETTINGS,
  arenaRadius: 600,
  maxSpeed: 400,
  dashSpeed: 900,
  knockSpeed: 500,
};
const SERVER_TUNED = configFrom(TUNING, 'sumo');

describe('OwnPrediction against the server', () => {
  it.each([
    ['the starting values', DEFAULT_CONFIG, clientConfig(0)],
    ['a live tuning', SERVER_TUNED, clientConfig(0, TUNING)],
  ])(
    'moves exactly as the server does with %s: momentum, top speed, a dash, a jump',
    (_, cfg, own) => {
      const match = new Match(cfg, 7, [{ id: 0, team: 0 }]);
      const ghost = match.state.ghosts[0];
      if (!ghost) throw new Error('no ghost');
      const p = new OwnPrediction(own);
      // Towards the middle of the arena, a dash downwards, then on down; a jump, and in the air
      // a turn the jump barely follows (JUMP 2026-11-17).
      const intents: Intent[] = [
        ...Array.from({ length: 20 }, () => ({ dx: 1, dy: 0 })),
        { dx: 0, dy: 1, action: 'dash' },
        ...Array.from({ length: 20 }, () => ({ dx: 0, dy: 1 })),
        { dx: 0, dy: 1, action: 'jump' },
        ...Array.from({ length: 20 }, () => ({ dx: -1, dy: 0 })),
      ];
      const server = (k: number): ServerOwn => ({
        x: ghost.x,
        y: ghost.y,
        vx: ghost.vx,
        vy: ghost.vy,
        dashLeftMs: Math.max(0, ghost.dashReadyMs - match.state.elapsedMs),
        jumpLeftMs: Math.max(0, ghost.jumpReadyMs - match.state.elapsedMs),
        airborne: match.state.elapsedMs < ghost.airUntilMs,
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
        const pressed = { dash: intent.action === 'dash', jump: intent.action === 'jump' };
        const shown = p.update(k * TICK, intent, seen, pressed);
        expect(shown?.x).toBeCloseTo(ghost.x, 6);
        expect(shown?.y).toBeCloseTo(ghost.y, 6);
        seen = server(k);
      });
    },
  );
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

// FIX 2026-11-17-3: the owner drove at bots and saw his ghost pass straight through them.
describe('OwnPrediction against other ghosts', () => {
  it('never draws the own ghost through another, also before the server answers', () => {
    const p = new OwnPrediction();
    const D = 2 * DEFAULT_CONFIG.ghostRadius;
    const other = { x: 500, y: 503 };
    const run = { dx: 1, dy: 0 };
    // The server's word stays at the start: its answer to the run has not arrived.
    p.update(0, run, at(400, 500, 0));
    let last = { x: 400, y: 500 };
    for (let t = 16; t <= 1500; t += 16) {
      const shown = p.update(t, run, at(400, 500, 0), { others: [other] });
      if (!shown) throw new Error('nothing drawn');
      expect(Math.hypot(shown.x - other.x, shown.y - other.y)).toBeGreaterThanOrEqual(D - 1e-6);
      // No hop over it either: it may only slide round it, as the server's contact lets it.
      expect(Math.hypot(shown.x - last.x, shown.y - last.y)).toBeLessThan(D / 4);
      last = shown;
    }
  });
});

// 2026-11-18, the owner's stutter: the path stopped at ghosts drawn a render buffer late, which
// the server pushes aside; it fell behind and the correction pulled it on in jerks.
describe('OwnPrediction running past another ghost', () => {
  it('keeps up with the server and glides round the ghost, never a jump', () => {
    const p = new OwnPrediction();
    const D = 2 * DEFAULT_CONFIG.ghostRadius;
    const other = { x: 500, y: 503 }; // still drawn where it stood; the server pushed it aside
    const run = { dx: 1, dy: 0 };
    // The server's word: the own ghost runs on at the top speed, PREDICTION_LAG_MS behind.
    const server = (t: number) =>
      at(400 + (235 * Math.max(0, t - PREDICTION_LAG_MS)) / 1000, 500, t);
    p.update(0, run, server(0));
    let last = { x: 400, y: 500 };
    let shown = last;
    for (let t = 16; t <= 1500; t += 16) {
      shown = p.update(t, run, server(t), { others: [other] }) ?? shown;
      expect(Math.hypot(shown.x - other.x, shown.y - other.y)).toBeGreaterThanOrEqual(D - 1e-6);
      expect(Math.hypot(shown.x - last.x, shown.y - last.y)).toBeLessThan(D / 4);
      last = shown;
    }
    expect(Math.abs(shown.x - server(1500).x)).toBeLessThan(20); // past it, with the server
  });
});

// NIGHT 2026-11-18, piece 6: with the dash's wind-up on, the own ghost holds as the core holds it,
// then dashes — not ahead of the server.
describe('OwnPrediction with the dash wind-up', () => {
  const run = (windUp: 0 | 1) => {
    const c = configFrom({ ...DEFAULT_SETTINGS, dashWindUp: windUp }, 'sumo');
    const p = new OwnPrediction(c);
    const right = { dx: 1, dy: 0 };
    p.update(0, { dx: 0, dy: 0 }, at(500, 500, 0));
    const x: Record<number, number> = {};
    for (let t = 16; t <= 320; t += 16) {
      x[t] = p.update(t, right, at(500, 500, t), { dash: t === 16 })?.x ?? NaN;
    }
    return x;
  };

  it('holds still through the wind-up, then dashes', () => {
    const wind = run(1);
    expect((wind[112] ?? NaN) - 500).toBeLessThan(2); // 96 ms after the press: still held
    expect((wind[320] ?? NaN) - 500).toBeGreaterThan(30); // the dash went at 136 ms
  });

  it('dashes at once with the wind-up off', () => {
    expect((run(0)[112] ?? NaN) - 500).toBeGreaterThan(30);
  });
});
