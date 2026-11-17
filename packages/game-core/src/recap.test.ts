// Seasonal Sumo — the recap's awards per mode, from the result: the top count wins, the lowest
// id of equal ones, nobody for a count of 0; Last One Standing names the one ghost left.

import { describe, expect, it } from 'vitest';
import type { GameMode } from './config.js';
import { awardsOf } from './recap.js';
import type { MatchResult, PlayerResult } from './types.js';

const player = (id: number, counts: Partial<PlayerResult>): PlayerResult => ({
  id,
  team: 0,
  score: 0,
  knockouts: 0,
  falls: 0,
  lives: 1,
  longestAliveMs: 0,
  scoreMs: 0,
  bounces: 0,
  passes: 0,
  ...counts,
});

const awards = (mode: GameMode, players: PlayerResult[], more: Partial<MatchResult> = {}) =>
  awardsOf({
    mode,
    variant: 'points',
    players,
    teams: [0, 0, 0, 0],
    left: [0, 0, 0, 0],
    knockedOut: [],
    winner: null,
    lastStanding: null,
    ...more,
  });

describe('match recap awards', () => {
  it('sumo: best pusher by knockouts, survivor by the longest time without a fall', () => {
    const players = [
      player(1, { knockouts: 3, longestAliveMs: 80_000 }),
      player(2, { knockouts: 3, longestAliveMs: 300_000 }),
      player(3, { knockouts: 1, longestAliveMs: 300_000 }),
    ];
    expect(awards('sumo', players)).toEqual([
      { kind: 'best-pusher', ghost: 1, value: 3 },
      { kind: 'survivor', ghost: 2, value: 300_000 },
    ]);
  });

  it('Last One Standing: the one ghost left with its lives, then the best pusher', () => {
    const players = [player(1, { knockouts: 4 }), player(2, { knockouts: 1, lives: 2 })];
    const standing = { variant: 'last-standing', winner: 1, lastStanding: 2 } as const;
    expect(awards('sumo', players, standing)).toEqual([
      { kind: 'last-standing', ghost: 2, value: 2 },
      { kind: 'best-pusher', ghost: 1, value: 4 },
    ]);
    // At the time limit with several left: a winning team, no single last one.
    const atTime = { ...standing, lastStanding: null };
    expect(awards('sumo', players, atTime).map((a) => a.kind)).toEqual(['best-pusher']);
  });

  it('hill: king by whole seconds in the zone, bouncer by opponents pushed out', () => {
    const players = [
      player(1, { scoreMs: 41_900, bounces: 2 }),
      player(2, { scoreMs: 12_000, bounces: 5 }),
    ];
    expect(awards('hill', players)).toEqual([
      { kind: 'king', ghost: 1, value: 41 },
      { kind: 'bouncer', ghost: 2, value: 5 },
    ]);
  });

  it('bomb: hot hands by passes, cool head by points at the end', () => {
    const players = [
      player(1, { scoreMs: 90_500, passes: 1 }),
      player(2, { scoreMs: 60_000, passes: 7 }),
    ];
    expect(awards('bomb', players)).toEqual([
      { kind: 'hot-hands', ghost: 2, value: 7 },
      { kind: 'cool-head', ghost: 1, value: 90 },
    ]);
  });

  it('leaves an award out that nobody earned', () => {
    expect(awards('sumo', [player(1, { longestAliveMs: 5000 })])).toEqual([
      { kind: 'survivor', ghost: 1, value: 5000 },
    ]);
    expect(awards('hill', [player(1, { scoreMs: 500 })])).toEqual([]);
  });
});
