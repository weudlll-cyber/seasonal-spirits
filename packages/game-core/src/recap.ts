// Seasonal Sumo — the match recap's awards, two per mode, and the players' final order, from the
// result at the end. An award nobody earned (a count of 0) is left out; of equal ones the lowest
// id gets it.
// - sumo, Points: "Best pusher" (most knockouts), "Survivor" (longest without a fall);
// - sumo, Last One Standing: "Last one standing" (the one ghost left, with its lives left —
//   none when the time limit left several), "Best pusher";
// - hill: "King" (most seconds in the zone), "Bouncer" (most opponents pushed out of it);
// - bomb: "Hot hands" (most passes), "Cool head" (most points at the end).

import type { GameMode } from './config.js';
import type { MatchResult, PlayerResult } from './types.js';

export const AWARD_KINDS = [
  'last-standing',
  'best-pusher',
  'survivor',
  'king',
  'bouncer',
  'hot-hands',
  'cool-head',
] as const;
export type AwardKind = (typeof AWARD_KINDS)[number];

// value: lives left, knockouts, ms, seconds, bounces, passes or points, by kind.
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

// The players' places (FIX 2026-11-17): by the mode's score in Points and the walled modes; in
// Last One Standing by survival — the last one standing first, then those of the winning team
// still in, the others still in, then the rest by when they went out (later out, better place),
// ties by their time on the arena, then knockouts. The lowest id first among equals.
export function ranked(r: MatchResult): PlayerResult[] {
  const keys = (p: PlayerResult): number[] =>
    r.variant === 'last-standing'
      ? [
          p.id === r.lastStanding ? 1 : 0,
          p.outAtMs === null && p.team === r.winner ? 1 : 0,
          p.outAtMs === null ? 1 : 0,
          p.outAtMs ?? 0,
          p.aliveMs,
          p.knockouts,
        ]
      : [p.score];
  const order = (a: PlayerResult, b: PlayerResult): number => {
    const ka = keys(a);
    const kb = keys(b);
    const i = ka.findIndex((v, k) => v !== kb[k]);
    return i === -1 ? a.id - b.id : (kb[i] ?? 0) - (ka[i] ?? 0);
  };
  return [...r.players].sort(order);
}

export function awardsOf(r: MatchResult): Award[] {
  const out: Award[] = [];
  const last = r.players.find((p) => p.id === r.lastStanding);
  if (last) out.push({ kind: 'last-standing', ghost: last.id, value: last.lives });
  const measures = r.variant === 'last-standing' ? MEASURES.sumo.slice(0, 1) : MEASURES[r.mode];
  for (const [kind, measure] of measures) {
    let best: Award | null = null;
    for (const p of r.players) {
      const value = measure(p);
      if (value > 0 && (!best || value > best.value)) best = { kind, ghost: p.id, value };
    }
    if (best) out.push(best);
  }
  return out;
}
