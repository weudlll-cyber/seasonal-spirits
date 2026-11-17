// Seasonal Sumo — what a human-like bot (bots/human.ts) perceives: the public match state seen a
// reaction time late, as a player at a screen sees it (grown from Seasonal Spirits' human
// stand-in).

import type { Ghost, MatchState } from '../types.js';

// A copy of the state as it was in one tick: what a late look shows.
function snapshot(s: Readonly<MatchState>): MatchState {
  return {
    ...s,
    clock: { ...s.clock },
    arena: { ...s.arena, centre: { ...s.arena.centre } },
    zone: s.zone && { ...s.zone },
    bombs: s.bombs.map((b) => ({ ...b })),
    ghosts: s.ghosts.map((g) => ({ ...g, lastTouch: g.lastTouch && { ...g.lastTouch } })),
    events: [],
  };
}

// The recent past of one match, one snapshot per tick, shared by every looker with the same
// reaction time. Keyed by the match's state object (one per match, updated in place) and the
// reaction time; each list is bounded by its reaction time.
const pasts = new WeakMap<Readonly<MatchState>, Map<number, MatchState[]>>();

function seenAt(s: Readonly<MatchState>, reactionMs: number): Readonly<MatchState> {
  if (reactionMs <= 0) return s;
  const byDelay = pasts.get(s) ?? new Map<number, MatchState[]>();
  pasts.set(s, byDelay);
  const past = byDelay.get(reactionMs) ?? [];
  byDelay.set(reactionMs, past);
  if (past.at(-1)?.tick !== s.tick) past.push(snapshot(s));
  // Keep the newest snapshot old enough, drop everything older than it.
  const due = s.elapsedMs - reactionMs;
  while (past.length > 1 && (past[1]?.elapsedMs ?? Infinity) <= due) past.shift();
  return past[0] ?? s;
}

// What `meId` perceives now: the whole playing area as it was `reactionMs` ago — what every
// player's screen shows (owner 2026-11-17: the whole arena always on screen).
export function perceive(
  s: Readonly<MatchState>,
  meId: number,
  reactionMs: number,
): { state: Readonly<MatchState>; me: Readonly<Ghost> } | null {
  const seen = seenAt(s, reactionMs);
  const me = seen.ghosts.find((g) => g.id === meId);
  return me ? { state: seen, me } : null;
}
