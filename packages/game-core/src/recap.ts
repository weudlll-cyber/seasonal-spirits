// Seasonal Spirits — the match recap's awards (owner decision 2026-11-16, an idea from a
// Copilot review), folded from the match events tick by tick. Pure and bounded: running bests
// and one total per ghost, no event log. An award nobody earned stays null and is left out of
// the recap. "Best nose" replaced "Biggest steal" with V5 (owner decision 2026-11-16).

import type { MatchState } from './types.js';

export interface Awards {
  // The most points secured over the match from coins carried across a halving (the
  // `secured` event's crossedValue, summed per ghost); the first to reach the top keeps it.
  bestNose: { ghost: number; value: number } | null;
  noseByGhost: Readonly<Record<number, number>>; // the running sums; bounded by the ghosts
  // The completed secure started with the least time left before its season's deadline (the
  // `secured` event's leftMs); the first of equal ones keeps it.
  closestSave: { ghost: number; leftMs: number } | null;
  // The last secure completed before the match end.
  lastSecure: { ghost: number; value: number } | null;
}

export const NO_AWARDS: Awards = {
  bestNose: null,
  noseByGhost: {},
  closestSave: null,
  lastSecure: null,
};

// The awards after one more tick: `s` is the state right after it (its events are that tick's).
export function noteAwards(a: Readonly<Awards>, s: Readonly<MatchState>): Awards {
  let { bestNose, closestSave, lastSecure } = a;
  let noseByGhost = a.noseByGhost;
  for (const e of s.events) {
    if (e.type !== 'secured') continue;
    if (!closestSave || e.leftMs < closestSave.leftMs) {
      closestSave = { ghost: e.ghost, leftMs: e.leftMs };
    }
    lastSecure = { ghost: e.ghost, value: e.value };
    if (e.crossedValue <= 0) continue;
    const total = (noseByGhost[e.ghost] ?? 0) + e.crossedValue;
    noseByGhost = { ...noseByGhost, [e.ghost]: total };
    if (!bestNose || total > bestNose.value) bestNose = { ghost: e.ghost, value: total };
  }
  return { bestNose, noseByGhost, closestSave, lastSecure };
}
