// Seasonal Spirits — what the human stand-in (standin.ts) perceives: the public match state cut
// to a view around itself and seen a reaction time late, as a player at a screen sees it.

import type { Ghost, MatchState } from '../types.js';

// Half the width and half the height of a view in field units: the rectangle around a ghost,
// kept inside the field like the client's camera.
export interface ViewHalfSize {
  x: number;
  y: number;
}

export interface Sight {
  view: ViewHalfSize | null; // null: the whole field
  reactionMs: number; // 0: now
}

// A copy of the state as it was in one tick: what a late look shows.
function snapshot(s: Readonly<MatchState>): MatchState {
  return {
    ...s,
    clock: { ...s.clock },
    ghosts: s.ghosts.map((g) => ({ ...g, carried: { ...g.carried } })),
    coins: s.coins.map((c) => ({ ...c })),
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

// The view rectangle around `me`, kept inside the field like the client's camera (a view
// wider than the field shows all of it).
export function viewRect(
  fieldSize: number,
  me: { x: number; y: number },
  view: ViewHalfSize,
): { left: number; right: number; top: number; bottom: number } {
  const centre = (c: number, half: number): number =>
    2 * half >= fieldSize ? fieldSize / 2 : Math.min(Math.max(c, half), fieldSize - half);
  const cx = centre(me.x, view.x);
  const cy = centre(me.y, view.y);
  return { left: cx - view.x, right: cx + view.x, top: cy - view.y, bottom: cy + view.y };
}

// What `meId` perceives now: the state `sight.reactionMs` ago, cut to its view there. Its own
// ghost is always in it (a player always sees itself).
export function perceive(
  fieldSize: number,
  s: Readonly<MatchState>,
  meId: number,
  sight: Sight,
): { state: Readonly<MatchState>; me: Readonly<Ghost> } | null {
  const seen = seenAt(s, sight.reactionMs);
  const me = seen.ghosts.find((g) => g.id === meId);
  if (!me) return null;
  if (sight.view === null) return { state: seen, me };
  const r = viewRect(fieldSize, me, sight.view);
  const inside = (p: { x: number; y: number }): boolean =>
    p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  const state = {
    ...seen,
    ghosts: seen.ghosts.filter((g) => g.id === meId || inside(g)),
    coins: seen.coins.filter(inside),
  };
  return { state, me };
}
