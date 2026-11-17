// Seasonal Sumo — the text messages between client and server (state travels as binary).
// Client → server: the hello, a direction, the one action. Server → client: the welcome or the
// notice that the client watches instead, the match recap, the live tuning. Shapes only; the
// readers check them.

import type { Tuning } from './tuning.js';

// A player sends a direction (each component in [-1, 1]; the server clamps the magnitude)
// and an action, Dash or Jump (the core keeps their cooldowns and decides who is in the air).
// Spectators send nothing after the hello.
export interface ClientHello {
  kind: 'player' | 'spectator';
}

export interface ClientInput {
  kind: 'input';
  dx: number;
  dy: number;
}

export type GameAction = 'dash' | 'jump';

export interface ClientAction {
  kind: 'action';
  action: GameAction;
}

export type ClientMessage = ClientHello | ClientInput | ClientAction;

// Server → player, once, as text: which ghost the player steers, its team and its name.
export interface ServerWelcome {
  kind: 'welcome';
  ghost: number;
  team: number;
  name: string;
}

// Server → a client that asked to play when every slot already has a player: it watches the
// match as a spectator instead and must send nothing more.
export interface ServerSpectating {
  kind: 'spectating';
  reason: 'full';
}

// Server → every client, once when a match ends (and to a client that arrives during the result
// pause): the mode's score per team and player, the ghosts still in per team, the teams knocked
// out in order, Last One Standing's winning team (null in Points: the scores rank), and the
// awards the match earned (game-core recap.ts: kind, ghost, value — lives left, knockouts, ms,
// seconds, bounces, passes or points by kind).
// An award nobody earned is left out; a client shows the kinds it knows. Names are the
// client's (ghostName).
export interface ServerRecap {
  kind: 'recap';
  teams: [number, number, number, number];
  left: [number, number, number, number];
  knockedOut: number[];
  winner: number | null;
  players: { ghost: number; team: number; score: number }[]; // in their final places
  awards: { kind: string; ghost: number; value: number }[];
}

// Server → every client, only when the server runs with the owner's live tuning (development
// only): the numbers now in force, on the hello and after every change, so the own ghost's
// prediction moves by the server's rules (tuning.ts).
export interface ServerTuning {
  kind: 'tuning';
  values: Tuning;
}

export type ServerMessage = ServerWelcome | ServerSpectating | ServerRecap | ServerTuning;

// The name shown for a ghost, the same on every client. Development mode has no sign-in, so a
// player is "Player <ghost>" until the website provides names (CONCEPT.md §12, point 2).
export function ghostName(ghost: number, isBot: boolean): string {
  return `${isBot ? 'Bot' : 'Player'} ${ghost}`;
}

// The short tag of a ghost where its full name does not fit (a crowd): the bot's number, or
// "P<ghost>" for a player — never nothing (owner's observation 2026-11-15).
export function ghostTag(ghost: number, isBot: boolean): string {
  return isBot ? String(ghost) : `P${ghost}`;
}
