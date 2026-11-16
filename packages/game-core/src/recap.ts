// Seasonal Spirits — the match recap's awards (owner decision 2026-11-16, an idea from a
// Copilot review), folded from the match events tick by tick. Pure and bounded: running
// bests, no event log. An award nobody earned stays null and is left out of the recap.
// "Biggest steal" went with stealing (V5, owner decision 2026-11-16).

import type { MatchState } from './types.js';

export interface Awards {
  // The completed secure started with the least time left before its season's deadline (the
  // `secured` event's leftMs); the first of equal ones keeps it.
  closestSave: { ghost: number; leftMs: number } | null;
  // The last secure completed before the match end.
  lastSecure: { ghost: number; value: number } | null;
}

export const NO_AWARDS: Awards = { closestSave: null, lastSecure: null };

// The awards after one more tick: `s` is the state right after it (its events are that tick's).
export function noteAwards(a: Readonly<Awards>, s: Readonly<MatchState>): Awards {
  let { closestSave, lastSecure } = a;
  for (const e of s.events) {
    if (e.type !== 'secured') continue;
    if (!closestSave || e.leftMs < closestSave.leftMs) {
      closestSave = { ghost: e.ghost, leftMs: e.leftMs };
    }
    lastSecure = { ghost: e.ghost, value: e.value };
  }
  return { closestSave, lastSecure };
}
