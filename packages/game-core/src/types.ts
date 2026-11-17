// Seasonal Sumo — the match state, the intents a ghost can send, and the match events, for
// every game mode. Everything here is public: bots and clients see the same state.

import type { GameMode, SumoVariant } from './config.js';
import type { Season, SeasonClock } from './seasons.js';

export type Team = 0 | 1 | 2 | 3;
export const TEAMS: readonly Team[] = [0, 1, 2, 3];

export interface Vec {
  x: number;
  y: number;
}

// A disc on the field: the hill's zone.
export interface Disc {
  x: number;
  y: number;
  r: number;
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
  knockedUntilMs: number; // thrown by a dash hit: a crowd gives way to it until this match time
  dashReadyMs: number; // the next dash is allowed from this match time on
  airUntilMs: number; // a jump: in the air until this match time (jump.ts)
  jumpReadyMs: number; // the next jump is allowed from this match time on
  dodged: boolean; // this jump has let a dash pass underneath (one "Dodged!" per jump)
  // The last opponent that touched it and when: a fall within creditMs counts for that one.
  lastTouch: { by: number; atMs: number } | null;
  knockouts: number; // sumo: opponents it pushed off
  falls: number;
  lives: number; // left in this match; 0: out for the rest of it (LIVES 2026-11-17)
  outAtMs: number | null; // when it lost its last life
  aliveSinceMs: number; // the start or the last respawn
  longestAliveMs: number; // the longest stretch without a fall so far
  aliveMs: number; // all its stretches on the arena before the current one
  // hill: ms in the zone; bomb: its points in ms, 1000 a second (halved when it goes off) —
  // whole ms, so a sum of ticks is exact; a point is 1000.
  scoreMs: number;
  bounces: number; // hill: opponents it pushed out of the zone
  passes: number; // bomb: bombs it passed on
}

// Bomb: one bomb and who holds it; `from` gave it last and cannot get it back before
// `backAtMs`.
export interface Bomb {
  carrier: number;
  from: number | null;
  backAtMs: number;
}

// The actions: Dash (NIGHT 2026-11-17: Seasonal Sumo) and Jump (JUMP 2026-11-17).
export type Action = 'dash' | 'jump';

// A direction (magnitude clamped to 1 by the core) and at most one action per tick.
export interface Intent {
  dx: number;
  dy: number;
  action?: Action;
}

// Holding nothing: what a ghost without intent, an out ghost and an idle bot send.
export const IDLE: Intent = { dx: 0, dy: 0 };

export type MatchEvent =
  // Every season turn inside a match, season the new one: the mode's halving.
  | { type: 'halving'; atMs: number; season: Season }
  | { type: 'dash'; ghost: number }
  | { type: 'jump'; ghost: number }
  // A rival's dash (by) passed under the ghost in the air.
  | { type: 'dodge'; ghost: number; by: number }
  // by: the opponent credited with the knockout, null when nobody touched it in time.
  | { type: 'fall'; ghost: number; by: number | null; atMs: number }
  | { type: 'respawn'; ghost: number }
  | { type: 'pass'; from: number; to: number }
  | { type: 'match-end'; atMs: number };

// The arena: a disc in the middle of the field. After a halving its edge eases from `from` to
// `target` between `shrinkFromMs` and shrinkFromMs + arenaShrinkMs (arena.ts).
export interface Arena {
  centre: Vec;
  radius: number; // now
  from: number;
  target: number;
  shrinkFromMs: number;
  // The ghosts move with the edge while it eases (the owner's live tuning of the size, so a
  // slider never throws anyone off); a halving's edge leaves them where they are.
  carry: boolean;
}

export interface MatchState {
  mode: GameMode;
  variant: SumoVariant; // sumo's variant of this match; the walled modes play 'points'
  livesAtStart: number; // every ghost's lives when the match began
  elapsedMs: number;
  tick: number;
  clock: SeasonClock;
  lastHalvingMs: number; // when the arena last halved, 0 before: keep-halving's rhythm
  // Set during the last deadlineCountdownMs before the season's end: a halving, or in the
  // last season the match end; null otherwise and once the match has ended.
  countdownMs: number | null;
  ended: boolean;
  arena: Arena; // sumo's disc; in walled modes the disc inside the walls, never halved
  zone: Disc | null; // hill: the zone now; null in the other modes
  bombs: Bomb[]; // bomb: the bombs; empty in the other modes
  ghosts: Ghost[]; // sorted by id
  knockedOut: Team[]; // teams whose last ghost lost its last life, in that order
  // Set when the match ends (standing.ts): the winning team and, when one ghost was left, it.
  winner: Team | null;
  lastStanding: number | null;
  events: MatchEvent[]; // events of the last tick only
}

export interface PlayerResult {
  id: number;
  team: Team;
  score: number; // the mode's score: sumo knockouts, hill and bomb whole points
  knockouts: number;
  falls: number;
  lives: number;
  outAtMs: number | null; // when it lost its last life; null: still in at the end
  aliveMs: number; // its time on the arena in all
  longestAliveMs: number;
  scoreMs: number;
  bounces: number;
  passes: number;
}

export interface MatchResult {
  mode: GameMode;
  variant: SumoVariant;
  players: PlayerResult[];
  teams: number[]; // the players' scores summed per team, index = team
  left: number[]; // ghosts with lives left per team, index = team
  knockedOut: Team[];
  winner: Team | null; // Last One Standing only; Points ranks by the scores
  lastStanding: number | null;
}
