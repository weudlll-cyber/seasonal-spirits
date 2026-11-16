// Seasonal Sumo — the recap's awards: "Best pusher" from the fall events tick by tick (none
// without a credited fall), "Survivor" from the result.

import { describe, expect, it } from 'vitest';
import { NO_AWARDS, noteAwards, survivorOf, type Awards } from './recap.js';
import type { MatchEvent, MatchResult, MatchState } from './types.js';

function fold(ticks: MatchEvent[][]): Awards {
  return ticks.reduce((a, events) => noteAwards(a, { events } as MatchState), NO_AWARDS);
}

const fall = (ghost: number, by: number | null): MatchEvent => ({
  type: 'fall',
  ghost,
  by,
  atMs: 0,
});

describe('match recap awards', () => {
  it('leaves the best pusher out when no fall was credited', () => {
    expect(fold([[], [fall(3, null)], [{ type: 'dash', ghost: 1 }]]).bestPusher).toBeNull();
  });

  it('gives the best pusher to the most knockouts; the first to reach the top keeps it', () => {
    const a = fold([[fall(9, 2)], [fall(8, 4), fall(7, 4)], [fall(6, 2)], [fall(5, 3)]]);
    expect(a.bestPusher).toEqual({ ghost: 4, knockouts: 2 });
  });

  it('names the survivor: the longest stretch on the arena without a fall', () => {
    const r: MatchResult = {
      players: [
        { id: 1, team: 0, knockouts: 3, falls: 2, longestAliveMs: 80_000 },
        { id: 2, team: 1, knockouts: 0, falls: 0, longestAliveMs: 300_000 },
        { id: 3, team: 2, knockouts: 1, falls: 0, longestAliveMs: 300_000 },
      ],
      teams: [3, 0, 1, 0],
    };
    expect(survivorOf(r)).toEqual({ ghost: 2, ms: 300_000 });
  });
});
