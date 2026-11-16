// Seasonal Spirits — the text messages between client and server (state travels as binary).
// Client → server: the hello, a direction, the one action. Server → client: the welcome or
// the notice that the client watches instead, steal notices, the match recap. Shapes only;
// the readers check them.

// A player sends a direction (each component in [-1, 1]; the server clamps the magnitude)
// and the one action of CONCEPT.md §8. Spectators send nothing after the hello.
export interface ClientHello {
  kind: 'player' | 'spectator';
}

export interface ClientInput {
  kind: 'input';
  dx: number;
  dy: number;
}

export type GameAction = 'steal' | 'secure' | 'swap';

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

// Server → the two players involved in a steal, as text, in the tick it happened: the client
// shows "You stole 3 from Bot 7" or "Bot 7 stole 2 from you". Spectators and everyone else
// get nothing (owner's observation 2026-11-15: stealing was not understood).
export interface ServerSteal {
  kind: 'steal';
  thief: number; // ghost id
  victim: number; // ghost id
  coins: number;
}

// Server → every client, once when a match ends (and to a client that arrives during the
// result pause): the result and the awards the match earned (owner decision 2026-11-16). An
// award nobody earned is left out. Values in the game's units (halves allowed); names are the
// client's (ghostName).
export interface ServerRecap {
  kind: 'recap';
  teams: [number, number, number, number]; // secured value per team
  players: { ghost: number; team: number; secured: number }[];
  awards: {
    biggestSteal?: { thief: number; victim: number; coins: number };
    closestSave?: { ghost: number; leftMs: number }; // started this long before its deadline
    lastSecure?: { ghost: number; value: number };
  };
}

export type ServerMessage = ServerWelcome | ServerSpectating | ServerSteal | ServerRecap;

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
