// Seasonal Sumo — the clock's status line per mode: its name, the halving countdown (the arena
// halves, the zone jumps, the bomb goes off), the last chance before the match end (the
// server's STATE_TO_END), and "match over".

import { describe, expect, it } from 'vitest';
import { STATE_RESULT, STATE_TO_END, type ServerState } from '@seasonal-spirits/protocol';
import { statusLine } from './clock.js';

const state = (over: Partial<ServerState>): ServerState => ({
  tick: 0,
  serverMs: 0,
  matchMs: 0,
  season: 0,
  seasonNumber: 0,
  seasonLeftMs: 40_000,
  countdownMs: null,
  flags: 0,
  nextMatchMs: 0,
  teamScore: [0, 0, 0, 0],
  mode: 0,
  area: { x: 1000, y: 1000, r: 900 },
  next: { x: 1000, y: 1000, r: 636.4 },
  ghosts: [],
  ...over,
});

describe('clock status line', () => {
  it("counts down to each mode's halving", () => {
    const countdown = { countdownMs: 7000, seasonLeftMs: 7000 };
    expect([0, 1, 2].map((mode) => statusLine(state({ ...countdown, mode })))).toEqual([
      'HALVING in 0:07 — the arena halves, then Summer is in season',
      'HALVING in 0:07 — the zone jumps to Summer and halves',
      'HALVING in 0:07 — the bomb goes off',
    ]);
  });

  it('names the mode, the season and the time left', () => {
    expect(statusLine(state({ mode: 1 }))).toBe(
      'King of the Season · Spring · 0:40 left · next: Summer',
    );
  });

  it('says LAST CHANCE when the countdown runs to the match end', () => {
    const last = { season: 3, seasonNumber: 3, flags: STATE_TO_END };
    expect(statusLine(state({ ...last, countdownMs: 4200, seasonLeftMs: 4200 }))).toBe(
      'LAST CHANCE — push them off · 0:05',
    );
    expect(statusLine(state(last))).toBe('Seasonal Sumo · Winter · 0:40 to the end');
  });

  it('says the match is over during the result', () => {
    expect(statusLine(state({ season: 3, seasonNumber: 3, flags: STATE_RESULT }))).toBe(
      'Seasonal Sumo · match over',
    );
  });
});
