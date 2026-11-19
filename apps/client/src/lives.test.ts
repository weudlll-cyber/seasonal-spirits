// Seasonal Sumo — the band in sumo's variants (LIVES 2026-11-17): the hearts and "Out —
// watching" only for the own ghost and only in sumo; per team the ghosts still in (with the score
// in Points); Last One Standing's result table; the variant's rule in the help.

import { describe, expect, it } from 'vitest';
import {
  STATE_LAST_STANDING,
  type GhostState,
  type ServerRecap,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { variantRule } from './help.js';
import { heartsOf, heartsShown, ownOut } from './lives.js';
import { OwnMarker } from './own-marker.js';
import { teamLines } from './result.js';
import { chipOf } from './scores.js';

const ghost = (id: number, team: number, lives: number): GhostState =>
  ({ id, team, lives, flags: 0 }) as GhostState;

const state = (ghosts: GhostState[], more: Partial<ServerState> = {}): ServerState =>
  ({
    mode: 0,
    flags: 0,
    serverMs: 0,
    livesAtStart: 3,
    teamScore: [4, 1, 0, 0],
    ghosts,
    ...more,
  }) as ServerState;

describe('the own lives in the band', () => {
  const s = state([ghost(1, 0, 2), ghost(2, 1, 0)]);

  it('shows a heart per life the match began with, the lost ones faded, for the own ghost', () => {
    expect(heartsOf(s, 1)).toEqual([true, true, false]);
    expect(ownOut(s, 1)).toBe(false);
  });

  // FIX 2026-11-17-4: nine hearts pushed "You are Team …" off a phone's band.
  it('shows one heart each up to five lives, past that one heart and the number left', () => {
    expect(heartsShown([true, true, false])).toEqual({ each: [true, true, false], count: null });
    const nine = Array.from({ length: 9 }, (_, i) => i < 7);
    expect(heartsShown(nine)).toEqual({ each: [true], count: 7 });
    expect(heartsShown(nine.map(() => false))).toEqual({ each: [false], count: 0 });
  });

  it('says out — watching only when the own ghost has no life left', () => {
    expect(ownOut(s, 2)).toBe(true);
    expect(heartsOf(s, 2)).toEqual([false, false, false]);
  });

  it('shows nothing while watching (no own ghost) and nothing in the walled modes', () => {
    expect(heartsOf(s, null)).toBeNull();
    expect(ownOut(s, null)).toBe(false);
    expect(heartsOf({ ...s, mode: 1 }, 2)).toBeNull();
    expect(ownOut({ ...s, mode: 1 }, 2)).toBe(false);
  });

  it('counts no respawn down after the last life', () => {
    const m = new OwnMarker();
    m.observe(state([{ ...ghost(1, 0, 1) }]), 1, 0, 3000);
    m.observe(state([{ ...ghost(1, 0, 0), flags: 4 }], { serverMs: 50 }), 1, 50, 3000);
    expect(m.backInMs()).toBeNull();
  });
});

describe('per team in the band', () => {
  const ghosts = [ghost(1, 0, 2), ghost(2, 0, 0), ghost(3, 1, 1)];

  it('Points: the score and the ghosts still in', () => {
    expect(chipOf(state(ghosts), 0)).toEqual({ text: '4 · 1 in', rank: 4 });
  });

  it('Last One Standing: only the ghosts still in, which lead', () => {
    const s = state(ghosts, { flags: STATE_LAST_STANDING });
    expect(chipOf(s, 1)).toEqual({ text: '1 in', rank: 1 });
  });

  it('the walled modes: the score alone', () => {
    expect(chipOf(state(ghosts, { mode: 1 }), 0)).toEqual({ text: '4', rank: 4 });
  });
});

describe('the result table', () => {
  const recap = (more: Partial<ServerRecap>): ServerRecap => ({
    kind: 'recap',
    teams: [5, 3, 9, 1],
    left: [0, 0, 0, 0],
    knockedOut: [],
    winner: null,
    players: [],
    awards: [],
    ...more,
  });

  it('Points: by score', () => {
    expect(teamLines(recap({})).map(([t]) => t)).toEqual([2, 0, 1, 3]);
  });

  it('Last One Standing: the winner, the teams still in, then the knocked out, last out first', () => {
    const r = recap({ winner: 1, left: [0, 1, 2, 0], knockedOut: [3, 0] });
    expect(teamLines(r)).toEqual([
      [1, 'winner'],
      [2, '2 still in'],
      [0, 'out 2nd'],
      [3, 'out 1st'],
    ]);
  });
});

describe("the help's variant rule", () => {
  it('says each variant in one sentence with the lives, nothing in the walled modes', () => {
    expect(variantRule({ mode: 0, flags: 0, livesAtStart: 3 })).toMatch(/^Points — .*3 lives/);
    expect(variantRule({ mode: 0, flags: STATE_LAST_STANDING, livesAtStart: 1 })).toMatch(
      /^Last One Standing — no points: you have 1 life, .*last ghost still in the arena wins/,
    );
    expect(variantRule({ mode: 2, flags: 0, livesAtStart: 3 })).toBeNull();
  });
});
