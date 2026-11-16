// Seasonal Sumo — the match state, the intents a ghost can send, and the match events.
// Everything here is public: bots and clients see the same state.

import type { Season, SeasonClock } from './seasons.js';

export type Team = 0 | 1 | 2 | 3;
export const TEAMS: readonly Team[] = [0, 1, 2, 3];

export interface Vec {
  x: number;
  y: number;
}

// A ghost's life: on the arena, falling off it (the animation), out until the respawn.
export type GhostPhase = 'in' | 'falling' | 'out';

export interface Ghost {
  id: number;
  team: Team;
  x: number;
  y: number;
  vx: number; // units/s
  vy: number;
  phase: GhostPhase;
  phaseUntilMs: number; // when 'falling' turns 'out', 'out' turns 'in'; 0 while 'in'
  protectedUntilMs: number; // after a respawn: nothing pushes it before this match time
  dashUntilMs: number; // a dash in progress knocks what it hits until this match time
  dashReadyMs: number; // the next dash is allowed from this match time on
  // The last opponent that touched it and when: a fall within creditMs counts for that one.
  lastTouch: { by: number; atMs: number } | null;
  knockouts: number;
  falls: number;
  aliveSinceMs: number; // the start or the last respawn
  longestAliveMs: number; // the longest stretch without a fall so far
}

// The one action (NIGHT 2026-11-17: Seasonal Sumo).
export type Action = 'dash';

// A direction (magnitude clamped to 1 by the core) and at most one action per tick.
export interface Intent {
  dx: number;
  dy: number;
  action?: Action;
}

// Holding nothing: what a ghost without intent, an out ghost and an idle bot send.
export const IDLE: Intent = { dx: 0, dy: 0 };

export type MatchEvent =
  // Every season turn inside a match; season is the new one, radius the arena's new target.
  | { type: 'halving'; atMs: number; season: Season; radius: number }
  | { type: 'dash'; ghost: number }
  // by: the opponent credited with the knockout, null when nobody touched it in time.
  | { type: 'fall'; ghost: number; by: number | null; atMs: number }
  | { type: 'respawn'; ghost: number }
  | { type: 'match-end'; atMs: number };

// The arena: a disc in the middle of the field. After a halving its edge eases from `from` to
// `target` between `shrinkFromMs` and shrinkFromMs + arenaShrinkMs (arena.ts).
export interface Arena {
  centre: Vec;
  radius: number; // now
  from: number;
  target: number;
  shrinkFromMs: number;
}

export interface MatchState {
  elapsedMs: number;
  tick: number;
  clock: SeasonClock;
  // Set during the last deadlineCountdownMs before the season's end: a halving, or in the
  // last season the match end; null otherwise and once the match has ended.
  countdownMs: number | null;
  ended: boolean;
  arena: Arena;
  ghosts: Ghost[]; // sorted by id
  events: MatchEvent[]; // events of the last tick only
}

export interface MatchResult {
  players: { id: number; team: Team; knockouts: number; falls: number; longestAliveMs: number }[];
  teams: number[]; // knockouts per team, index = team
}
