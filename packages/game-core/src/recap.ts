// Seasonal Sumo — the match recap's awards, as Seasonal Spirits' recap folded them from the
// match events tick by tick. Pure and bounded: one running best and one count per ghost, no
// event log. An award nobody earned stays null and is left out of the recap.
// - "Best pusher": the most knockouts; the first to reach the top keeps it.
// - "Survivor": the longest time on the arena without a fall, from the result at the end.

import type { MatchResult, MatchState } from './types.js';

export interface Awards {
  bestPusher: { ghost: number; knockouts: number } | null;
  knockoutsByGhost: Readonly<Record<number, number>>; // the running counts; bounded by the ghosts
}

export const NO_AWARDS: Awards = { bestPusher: null, knockoutsByGhost: {} };

// The awards after one more tick: `s` is the state right after it (its events are that tick's).
export function noteAwards(a: Readonly<Awards>, s: Readonly<MatchState>): Awards {
  let { bestPusher, knockoutsByGhost } = a;
  for (const e of s.events) {
    if (e.type !== 'fall' || e.by === null) continue;
    const n = (knockoutsByGhost[e.by] ?? 0) + 1;
    knockoutsByGhost = { ...knockoutsByGhost, [e.by]: n };
    if (!bestPusher || n > bestPusher.knockouts) bestPusher = { ghost: e.by, knockouts: n };
  }
  return { bestPusher, knockoutsByGhost };
}

// The ghost that stayed on the arena longest without a fall; the lowest id of equal ones.
export function survivorOf(r: MatchResult): { ghost: number; ms: number } | null {
  let best: { ghost: number; ms: number } | null = null;
  for (const p of r.players) {
    if (!best || p.longestAliveMs > best.ms) best = { ghost: p.id, ms: p.longestAliveMs };
  }
  return best;
}
