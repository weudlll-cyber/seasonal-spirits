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
  lastStealMs: number;
  lastPoolTakeMs: number;
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
  | { type: 'season'; season: Season; atMs: number }
  | { type: 'halving'; atMs: number; carriedBefore: number; carriedAfter: number; pooled: number }
  | { type: 'swap'; ghost: number; from: Season; spent: number; got: number }
  | { type: 'secure-start'; ghost: number }
  | { type: 'secured'; ghost: number; value: number }
  | { type: 'secure-interrupted'; ghost: number }
  | { type: 'steal'; thief: number; victim: number; coins: number };

// Running totals kept for the sanity list of `pnpm simulate`.
export interface MatchStats {
  spawned: number;
  pooled: number;
  poolTaken: number;
}

export interface MatchState {
  elapsedMs: number;
  tick: number;
  clock: SeasonClock;
  halvingCountdownMs: number | null; // set during the last halvingCountdownMs before it
  halvingDone: boolean;
  ended: boolean;
  ghosts: Ghost[]; // sorted by id
  coins: FieldCoin[];
  pool: SeasonCounts;
  poolCenter: Vec;
  shrines: readonly Vec[]; // index = team
  events: MatchEvent[]; // events of the last tick only
  stats: MatchStats;
}

export interface MatchResult {
  players: { id: number; team: Team; secured: number }[];
  teams: number[]; // secured value per team, index = team
}
