// Seasonal Spirits — the text messages between client and server (state travels as binary).
// Client → server: the hello, a direction, the one action. Server → client: the welcome or
// the notice that the client watches instead. Shapes only; the readers check them.

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

export type ServerMessage = ServerWelcome | ServerSpectating;

// The name shown for a ghost, the same on every client. Development mode has no sign-in, so a
// player is "Player <ghost>" until the website provides names (CONCEPT.md §12, point 2).
export function ghostName(ghost: number, isBot: boolean): string {
  return `${isBot ? 'Bot' : 'Player'} ${ghost}`;
}
