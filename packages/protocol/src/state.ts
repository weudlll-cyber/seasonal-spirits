// Seasonal Spirits — binary state encoding of a match, sent by the server every tick.
// One encoding only: viewer, probe and later clients decode it. Seasons travel as their
// index in the real order (0 Spring, 1 Summer, 2 Autumn, 3 Winter).

export interface GhostState {
  id: number; // 0..255
  x: number; // 0..65535 units
  y: number;
  team: number; // 0..3
  carried: number; // carried coins of all seasons, 0..65535
  flags: number; // GHOST_* bits
}

export const GHOST_CARRIER = 1;
export const GHOST_SECURING = 2;
export const GHOST_BOT = 4;

export interface CoinState {
  x: number; // every field coin is of the current season
  y: number;
}

export interface ServerState {
  tick: number; // u32 since server start
  serverMs: number; // u32 ms since server start
  matchMs: number; // u32 ms since the match started
  season: number; // current season index; the next is (season + 1) % 4
  seasonLeftMs: number; // u32 until the season turns (or the match ends)
  countdownMs: number | null; // halving countdown, null outside the last 10 s before it
  flags: number; // STATE_* bits
  pool: [number, number, number, number]; // centre pool per season
  teamSecured: [number, number, number, number]; // secured value per team, in halves
  ghosts: GhostState[]; // up to 255
  coins: CoinState[]; // up to 255
}

export const STATE_HALVING_EVENT = 1; // the halving happened in this tick
export const STATE_HALVING_DONE = 2;
export const STATE_RESULT = 4; // the match is over; the result pause before the next

// Header: tick u32 · serverMs u32 · matchMs u32 · season u8 · seasonLeftMs u32 ·
// countdownMs u16 (0xffff = none) · flags u8 · pool 4×u16 · teamSecured 4×u16 (value × 2) ·
// ghost count u8 · coin count u8 — all little endian.
// Ghost: id u8 · x u16 · y u16 · team u8 · carried u16 · flags u8.  Coin: x u16 · y u16.
export const HEADER_BYTES = 38;
export const GHOST_BYTES = 9;
export const COIN_BYTES = 4;
const NO_COUNTDOWN = 0xffff;

export function encodedSize(ghostCount: number, coinCount: number): number {
  return HEADER_BYTES + GHOST_BYTES * ghostCount + COIN_BYTES * coinCount;
}

const u16 = (v: number): number => Math.max(0, Math.min(65535, Math.round(v)));

export function encodeState(s: ServerState): Uint8Array {
  if (s.ghosts.length > 255 || s.coins.length > 255) {
    throw new Error('encodeState: more than 255 ghosts or coins');
  }
  const buf = new Uint8Array(encodedSize(s.ghosts.length, s.coins.length));
  const v = new DataView(buf.buffer);
  v.setUint32(0, s.tick >>> 0, true);
  v.setUint32(4, s.serverMs >>> 0, true);
  v.setUint32(8, s.matchMs >>> 0, true);
  v.setUint8(12, s.season & 0x03);
  v.setUint32(13, s.seasonLeftMs >>> 0, true);
  v.setUint16(
    17,
    s.countdownMs === null ? NO_COUNTDOWN : Math.min(NO_COUNTDOWN - 1, u16(s.countdownMs)),
    true,
  );
  v.setUint8(19, s.flags & 0xff);
  for (let i = 0; i < 4; i++) {
    v.setUint16(20 + 2 * i, u16(s.pool[i] ?? 0), true);
    v.setUint16(28 + 2 * i, u16((s.teamSecured[i] ?? 0) * 2), true);
  }
  v.setUint8(36, s.ghosts.length);
  v.setUint8(37, s.coins.length);
  let o = HEADER_BYTES;
  for (const g of s.ghosts) {
    v.setUint8(o, g.id & 0xff);
    v.setUint16(o + 1, u16(g.x), true);
    v.setUint16(o + 3, u16(g.y), true);
    v.setUint8(o + 5, g.team & 0x03);
    v.setUint16(o + 6, u16(g.carried), true);
    v.setUint8(o + 8, g.flags & 0xff);
    o += GHOST_BYTES;
  }
  for (const c of s.coins) {
    v.setUint16(o, u16(c.x), true);
    v.setUint16(o + 2, u16(c.y), true);
    o += COIN_BYTES;
  }
  return buf;
}

export function decodeState(buf: Uint8Array): ServerState {
  if (buf.byteLength < HEADER_BYTES) throw new Error('decodeState: buffer too short for header');
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ghostCount = v.getUint8(36);
  const coinCount = v.getUint8(37);
  const expected = encodedSize(ghostCount, coinCount);
  if (buf.byteLength !== expected) {
    throw new Error(`decodeState: expected ${expected} bytes, got ${buf.byteLength}`);
  }
  const countdown = v.getUint16(17, true);
  const four = (at: number, scale: number): [number, number, number, number] => [
    v.getUint16(at, true) / scale,
    v.getUint16(at + 2, true) / scale,
    v.getUint16(at + 4, true) / scale,
    v.getUint16(at + 6, true) / scale,
  ];
  const ghosts: GhostState[] = [];
  let o = HEADER_BYTES;
  for (let i = 0; i < ghostCount; i++, o += GHOST_BYTES) {
    ghosts.push({
      id: v.getUint8(o),
      x: v.getUint16(o + 1, true),
      y: v.getUint16(o + 3, true),
      team: v.getUint8(o + 5),
      carried: v.getUint16(o + 6, true),
      flags: v.getUint8(o + 8),
    });
  }
  const coins: CoinState[] = [];
  for (let i = 0; i < coinCount; i++, o += COIN_BYTES) {
    coins.push({ x: v.getUint16(o, true), y: v.getUint16(o + 2, true) });
  }
  return {
    tick: v.getUint32(0, true),
    serverMs: v.getUint32(4, true),
    matchMs: v.getUint32(8, true),
    season: v.getUint8(12),
    seasonLeftMs: v.getUint32(13, true),
    countdownMs: countdown === NO_COUNTDOWN ? null : countdown,
    flags: v.getUint8(19),
    pool: four(20, 1),
    teamSecured: four(28, 2),
    ghosts,
    coins,
  };
}

// Client -> server messages, JSON over the text channel; parseClientMessage validates them.
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

// Server -> player, once, as text: which ghost the player steers.
export interface ServerWelcome {
  kind: 'welcome';
  ghost: number;
  team: number;
}
