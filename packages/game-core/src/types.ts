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
  // Of the carried coins, those got from a swap that no steal can take until the next
  // halving (rule trial R2, swappedStealProof); all zero while the rule is off.
  shielded: SeasonCounts;
  securedValue: number;
  securingUntilMs: number | null; // a secure in progress ends at this match time
  securingSeason: Season | null; // the season whose values the secure banks at
  lastStealMs: number;
}

export interface FieldCoin {
  id: number;
  x: number;
  y: number;
  season: Season;
}

// The one field action (steal) and the two shrine actions (CONCEPT.md §8).
export type Action = 'steal' | 'secure' | 'swap';

// A direction (magnitude clamped to 1 by the core) and at most one action per tick.
export interface Intent {
  dx: number;
  dy: number;
  action?: Action;
}

export type MatchEvent =
  // Every season turn inside a match (CONCEPT.md §2b, §13); season is the new one.
  | { type: 'halving'; atMs: number; season: Season; fieldCoinsCleared: number; carried: number }
  | { type: 'swap'; ghost: number; from: Season; spent: number; got: number }
  | { type: 'secure-start'; ghost: number }
  | { type: 'secured'; ghost: number; value: number }
  | { type: 'secure-interrupted'; ghost: number }
  | { type: 'steal'; thief: number; victim: number; coins: number };

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
  halvingCountdownMs: number | null; // set during the last halvingCountdownMs before a halving
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
