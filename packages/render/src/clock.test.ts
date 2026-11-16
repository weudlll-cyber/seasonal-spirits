// Seasonal Sumo — the clock's status line: the halving countdown (the arena halves), the last
// chance before the match end (the server's STATE_TO_END), and "Match over".

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
  arenaRadius: 900,
  arenaNext: 636.4,
  ghosts: [],
  ...over,
});

describe('clock status line', () => {
  it('counts down to a halving: the arena halves, then the next season', () => {
    expect(statusLine(state({ countdownMs: 7000, seasonLeftMs: 7000 }))).toBe(
      'HALVING in 0:07 — the arena halves, then Summer is in season',
    );
  });

  it('says LAST CHANCE when the countdown runs to the match end', () => {
    const last = { season: 3, seasonNumber: 3, flags: STATE_TO_END };
    expect(statusLine(state({ ...last, countdownMs: 4200, seasonLeftMs: 4200 }))).toBe(
      'LAST CHANCE — push them off · 0:05',
    );
    expect(statusLine(state(last))).toBe('Winter · 0:40 to the end');
  });

  it('says the match is over during the result', () => {
    expect(statusLine(state({ season: 3, seasonNumber: 3, flags: STATE_RESULT }))).toBe(
      'Match over',
    );
  });
});
