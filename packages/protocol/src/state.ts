// Seasonal Sumo — binary state encoding of a match, sent by the server every tick.
// One encoding only: viewer, client and probe decode it, and everything a client shows comes
// from it. Seasons travel as their index in the real order (0 Spring … 3 Winter), the game
// mode as its index in game-core's GAME_MODES (0 sumo, 1 hill, 2 bomb); the discs (the arena,
// the zone) in tenths of a field unit.

export interface GhostState {
  id: number; // 0..255
  x: number; // 0..65535 units
  y: number;
  vx: number; // units/s, −32768..32767: the own ghost's prediction starts from it
  vy: number;
  team: number; // 0..3
  score: number; // 0..65535: the mode's score (sumo knockouts, hill and bomb whole points)
  dashLeftMs: number; // until the next dash is allowed, in steps of 20 ms (the cooldown ring)
  flags: number; // GHOST_* bits
}

export const GHOST_BOT = 1;
export const GHOST_DASHING = 2; // a dash in progress: it knocks what it hits
export const GHOST_FALLING = 4; // falling off the arena (the animation)
export const GHOST_OUT = 8; // fallen, waiting to respawn: not drawn
export const GHOST_PROTECTED = 16; // just respawned: nothing pushes it
export const GHOST_BOMB = 32; // bomb mode: it carries a bomb

// A disc on the field: sumo's arena, the hill's zone.
export interface WireDisc {
  x: number;
  y: number;
  r: number;
}

export interface ServerState {
  tick: number; // u32 since server start
  serverMs: number; // u32 ms since server start
  matchMs: number; // u32 ms since the match started
  season: number; // current season index; the next is (season + 1) % 4
  seasonNumber: number; // 0-based season within the match; the start season is season - this
  seasonLeftMs: number; // u32 until the next halving (or the match end)
  // Countdown to the next deadline — a halving, or with STATE_TO_END the match end — null
  // outside its last 10 s.
  countdownMs: number | null;
  flags: number; // STATE_* bits
  nextMatchMs: number; // during the result: ms until the next match starts; else 0
  teamScore: [number, number, number, number]; // the mode's score per team
  mode: number; // index in GAME_MODES
  area: WireDisc | null; // drawn glowing: sumo's arena, the hill's zone; null in bomb
  next: WireDisc | null; // after the next halving: the dashed outline of its countdown
  ghosts: GhostState[]; // up to 255
}

// A halving (every season turn inside a match) happened in this tick; `season` is the new one.
export const STATE_HALVING_EVENT = 1;
export const STATE_RESULT = 2; // the match is over; the result pause before the next
// The next deadline is the match end, not a halving (the last season): seasonLeftMs and
// countdownMs run to it — "LAST CHANCE".
export const STATE_TO_END = 4;
// The match ended in this tick: "MATCH OVER" (in exactly one state, like the halving).
export const STATE_MATCH_END_EVENT = 8;

// Header: tick u32 · serverMs u32 · matchMs u32 · season u8 · seasonNumber u8 ·
// seasonLeftMs u32 · countdownMs u16 (0xffff = none) · flags u8 · nextMatchMs u16 ·
// teamScore 4×u16 · mode u8 · area x, y, r 3×u16 · next x, y, r 3×u16 (tenths; r 0 = none)
// · ghost count u8.
// Ghost: id u8 · x u16 · y u16 · vx i16 · vy i16 · team u8 · score u16 · dashLeft u8
// (20 ms steps) · flags u8. All little endian.
export const HEADER_BYTES = 45;
export const GHOST_BYTES = 14;
const NO_COUNTDOWN = 0xffff;
const DASH_STEP_MS = 20;

export function encodedSize(ghosts: number): number {
  return HEADER_BYTES + GHOST_BYTES * ghosts;
}

const u8 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
const u16 = (v: number): number => Math.max(0, Math.min(65535, Math.round(v)));
const i16 = (v: number): number => Math.max(-32768, Math.min(32767, Math.round(v)));
const tenths = (v: number): number => u16(v * 10);

export function encodeState(s: ServerState): Uint8Array {
  if (s.ghosts.length > 255) throw new Error('encodeState: more than 255 ghosts');
  const buf = new Uint8Array(encodedSize(s.ghosts.length));
  const v = new DataView(buf.buffer);
  writeHeader(v, s);
  let o = HEADER_BYTES;
  for (const g of s.ghosts) o = writeGhost(v, o, g);
  return buf;
}

function writeHeader(v: DataView, s: ServerState): void {
  v.setUint32(0, s.tick >>> 0, true);
  v.setUint32(4, s.serverMs >>> 0, true);
  v.setUint32(8, s.matchMs >>> 0, true);
  v.setUint8(12, s.season & 0x03);
  v.setUint8(13, s.seasonNumber & 0xff);
  v.setUint32(14, s.seasonLeftMs >>> 0, true);
  const countdown =
    s.countdownMs === null ? NO_COUNTDOWN : Math.min(NO_COUNTDOWN - 1, u16(s.countdownMs));
  v.setUint16(18, countdown, true);
  v.setUint8(20, s.flags & 0xff);
  v.setUint16(21, u16(s.nextMatchMs), true);
  for (let i = 0; i < 4; i++) v.setUint16(23 + 2 * i, u16(s.teamScore[i] ?? 0), true);
  v.setUint8(31, s.mode & 0xff);
  writeDisc(v, 32, s.area);
  writeDisc(v, 38, s.next);
  v.setUint8(44, s.ghosts.length);
}

// A missing disc travels as zeros; a radius of 0 reads back as none.
function writeDisc(v: DataView, o: number, d: WireDisc | null): void {
  v.setUint16(o, tenths(d?.x ?? 0), true);
  v.setUint16(o + 2, tenths(d?.y ?? 0), true);
  v.setUint16(o + 4, tenths(d?.r ?? 0), true);
}

function readDisc(v: DataView, o: number): WireDisc | null {
  const at = (i: number): number => v.getUint16(o + 2 * i, true) / 10;
  const r = at(2);
  return r > 0 ? { x: at(0), y: at(1), r } : null;
}

function writeGhost(v: DataView, o: number, g: GhostState): number {
  v.setUint8(o, g.id & 0xff);
  v.setUint16(o + 1, u16(g.x), true);
  v.setUint16(o + 3, u16(g.y), true);
  v.setInt16(o + 5, i16(g.vx), true);
  v.setInt16(o + 7, i16(g.vy), true);
  v.setUint8(o + 9, g.team & 0x03);
  v.setUint16(o + 10, u16(g.score), true);
  v.setUint8(o + 12, u8(Math.ceil(g.dashLeftMs / DASH_STEP_MS)));
  v.setUint8(o + 13, g.flags & 0xff);
  return o + GHOST_BYTES;
}

export function decodeState(buf: Uint8Array): ServerState {
  if (buf.byteLength < HEADER_BYTES) throw new Error('decodeState: buffer too short for header');
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = v.getUint8(44);
  const expected = encodedSize(count);
  if (buf.byteLength !== expected) {
    throw new Error(`decodeState: expected ${expected} bytes, got ${buf.byteLength}`);
  }
  const ghosts: GhostState[] = [];
  for (let i = 0, o = HEADER_BYTES; i < count; i++, o += GHOST_BYTES) ghosts.push(readGhost(v, o));
  return { ...readHeader(v), ghosts };
}

function readHeader(v: DataView): Omit<ServerState, 'ghosts'> {
  const countdown = v.getUint16(18, true);
  const team = (i: number): number => v.getUint16(23 + 2 * i, true);
  return {
    tick: v.getUint32(0, true),
    serverMs: v.getUint32(4, true),
    matchMs: v.getUint32(8, true),
    season: v.getUint8(12),
    seasonNumber: v.getUint8(13),
    seasonLeftMs: v.getUint32(14, true),
    countdownMs: countdown === NO_COUNTDOWN ? null : countdown,
    flags: v.getUint8(20),
    nextMatchMs: v.getUint16(21, true),
    teamScore: [team(0), team(1), team(2), team(3)],
    mode: v.getUint8(31),
    area: readDisc(v, 32),
    next: readDisc(v, 38),
  };
}

function readGhost(v: DataView, o: number): GhostState {
  return {
    id: v.getUint8(o),
    x: v.getUint16(o + 1, true),
    y: v.getUint16(o + 3, true),
    vx: v.getInt16(o + 5, true),
    vy: v.getInt16(o + 7, true),
    team: v.getUint8(o + 9),
    score: v.getUint16(o + 10, true),
    dashLeftMs: v.getUint8(o + 12) * DASH_STEP_MS,
    flags: v.getUint8(o + 13),
  };
}
