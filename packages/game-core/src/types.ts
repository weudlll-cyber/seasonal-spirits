// Seasonal Spirits — the match state, the intents a ghost can send, and the match events.
// Everything here is public: bots and clients see the same state (CONCEPT.md §2a: a carrier
// is visible to all).

import type { Season, SeasonClock, SeasonCounts } from './seasons.js';

export type Team = 0 | 1 | 2 | 3;
export const TEAMS: readonly Team[] = [0, 1, 2, 3];

export interface Vec {
  x: number;
  y: number;
}

export interface Ghost {
  id: number;
  team: Team;
  x: number;
  y: number;
  carried: SeasonCounts;
  securedValue: number;
  securingUntilMs: number | null; // a secure in progress ends at this match time
  securingSeason: Season | null; // the season whose values the secure banks at
}

export interface FieldCoin {
  id: number;
  x: number;
  y: number;
  season: Season;
}

// The one action, at the own shrine (V5, owner decision 2026-11-16: stealing and the swap
// removed).
export type Action = 'secure';

// A direction (magnitude clamped to 1 by the core) and at most one action per tick.
export interface Intent {
  dx: number;
  dy: number;
  action?: Action;
}

export type MatchEvent =
  // Every season turn inside a match (CONCEPT.md §2b, §13); season is the new one.
  | { type: 'halving'; atMs: number; season: Season; fieldCoinsCleared: number; carried: number }
  // A field coin picked up (2026-11-16: the human round counts pickups per ghost).
  | { type: 'pickup'; ghost: number; coin: number }
  | { type: 'secure-start'; ghost: number }
  // leftMs: time that was left before the deadline of the season the secure banks at, when it
  // was started.
  | { type: 'secured'; ghost: number; value: number; leftMs: number }
  // The match ended in this tick (owner decision 2026-11-16: "MATCH OVER" at the end).
  | { type: 'match-end'; atMs: number };

// Running totals kept for the sanity list of `pnpm simulate`.
export interface MatchStats {
  spawned: number;
  pickedUp: number;
  cleared: number; // field coins that disappeared at a halving
}

export interface MatchState {
  elapsedMs: number;
  tick: number;
  clock: SeasonClock;
  // Set during the last deadlineCountdownMs before the season's end: a halving, or in the
  // last season the match end; null otherwise and once the match has ended.
  countdownMs: number | null;
  ended: boolean;
  ghosts: Ghost[]; // sorted by id
  coins: FieldCoin[];
  shrines: readonly Vec[]; // index = team
  events: MatchEvent[]; // events of the last tick only
  stats: MatchStats;
}

export interface MatchResult {
  players: { id: number; team: Team; secured: number }[];
  teams: number[]; // secured value per team, index = team
}
