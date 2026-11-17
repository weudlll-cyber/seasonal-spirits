// Seasonal Sumo — the match recap's awards, two per mode, from the result at the end. An award
// nobody earned (a count of 0) is left out; of equal ones the lowest id gets it.
// - sumo: "Best pusher" (most knockouts), "Survivor" (longest without a fall);
// - hill: "King" (most seconds in the zone), "Bouncer" (most opponents pushed out of it);
// - bomb: "Hot hands" (most passes), "Cool head" (most points at the end).

import type { GameMode } from './config.js';
import type { MatchResult, PlayerResult } from './types.js';

export const AWARD_KINDS = [
  'best-pusher',
  'survivor',
  'king',
  'bouncer',
  'hot-hands',
  'cool-head',
] as const;
export type AwardKind = (typeof AWARD_KINDS)[number];

// value: knockouts, ms, seconds, bounces, passes or points, by kind.
export interface Award {
  kind: AwardKind;
  ghost: number;
  value: number;
}

const MEASURES: Record<GameMode, [AwardKind, (p: PlayerResult) => number][]> = {
  sumo: [
    ['best-pusher', (p) => p.knockouts],
    ['survivor', (p) => p.longestAliveMs],
  ],
  hill: [
    ['king', (p) => Math.floor(p.scoreMs / 1000)],
    ['bouncer', (p) => p.bounces],
  ],
  bomb: [
    ['hot-hands', (p) => p.passes],
    ['cool-head', (p) => Math.floor(p.scoreMs / 1000)],
  ],
};

export function awardsOf(r: MatchResult): Award[] {
  const out: Award[] = [];
  for (const [kind, measure] of MEASURES[r.mode]) {
    let best: Award | null = null;
    for (const p of r.players) {
      const value = measure(p);
      if (value > 0 && (!best || value > best.value)) best = { kind, ghost: p.id, value };
    }
    if (best) out.push(best);
  }
  return out;
}
