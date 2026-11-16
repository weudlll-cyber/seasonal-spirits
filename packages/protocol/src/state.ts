// Seasonal Spirits — binary state encoding of a match, sent by the server every tick.
// One encoding only: viewer, client and probe decode it, and everything a client shows comes
// from it. Seasons travel as their index in the real order (0 Spring … 3 Winter); values in
// halves, because a coin outside its season is worth ½.

export interface GhostState {
  id: number; // 0..255
  x: number; // 0..65535 units
  y: number;
  team: number; // 0..3
  carried: number; // carried coins of all seasons, 0..65535
  offSeason: number; // of those, coins not of the current season: worth half now
  secured: number; // secured value so far (multiple of ½)
  flags: number; // GHOST_* bits
}

export const GHOST_CARRIER = 1;
export const GHOST_SECURING = 2;
export const GHOST_BOT = 4;
export const GHOST_AT_SHRINE = 8; // inside its own team's shrine
// A steal by this ghost would take something now (the core's canSteal): the lit Steal button.
export const GHOST_CAN_STEAL = 16;
// Carries swapped coins no steal can take until the next halving (the core's
// carriesShielded): the shield ring.
export const GHOST_SHIELDED = 32;

export interface CoinState {
  x: number; // every field coin is of the current season
  y: number;
}

// The two shrine buttons of a player standing in its own shrine (CONCEPT.md §3, §8), as the
// game core computes them; a client shows these numbers and never calculates its own.
export interface OfferState {
  ghost: number;
  secureValue: number;
  swapCoins: number; // coins of the next season a swap gives; 0 = no swap possible
  swapValueNow: number;
  swapValueLater: number;
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
  teamSecured: [number, number, number, number]; // secured value per team
  ghosts: GhostState[]; // up to 255
  coins: CoinState[]; // up to 255
  offers: OfferState[]; // players in their own shrine, up to 255
}

// A halving (every season turn inside a match) happened in this tick; `season` is the new one.
export const STATE_HALVING_EVENT = 1;
export const STATE_RESULT = 2; // the match is over; the result pause before the next
// The next deadline is the match end, not a halving (the last season): seasonLeftMs and
// countdownMs run to it — "LAST CHANCE — secure now".
export const STATE_TO_END = 4;
// The match ended in this tick: "MATCH OVER" (in exactly one state, like the halving).
export const STATE_MATCH_END_EVENT = 8;

// Header: tick u32 · serverMs u32 · matchMs u32 · season u8 · seasonNumber u8 ·
// seasonLeftMs u32 · countdownMs u16 (0xffff = none) · flags u8 · nextMatchMs u16 ·
// teamSecured 4×u16 (halves) · ghost count u8 · coin count u8 · offer count u8.
// Ghost: id u8 · x u16 · y u16 · team u8 · carried u16 · offSeason u16 · secured u16 (halves)
// · flags u8.  Coin: x u16 · y u16.  Offer: ghost u8 · secure, swapNow, swapLater u16
// (halves) and swapCoins u16. All little endian.
export const HEADER_BYTES = 34;
export const GHOST_BYTES = 13;
export const COIN_BYTES = 4;
export const OFFER_BYTES = 9;
const NO_COUNTDOWN = 0xffff;

export function encodedSize(ghosts: number, coins: number, offers = 0): number {
  return HEADER_BYTES + GHOST_BYTES * ghosts + COIN_BYTES * coins + OFFER_BYTES * offers;
}

const u16 = (v: number): number => Math.max(0, Math.min(65535, Math.round(v)));
const halves = (v: number): number => u16(v * 2);

export function encodeState(s: ServerState): Uint8Array {
  if (s.ghosts.length > 255 || s.coins.length > 255 || s.offers.length > 255) {
    throw new Error('encodeState: more than 255 ghosts, coins or offers');
  }
  const buf = new Uint8Array(encodedSize(s.ghosts.length, s.coins.length, s.offers.length));
  const v = new DataView(buf.buffer);
  writeHeader(v, s);
  let o = HEADER_BYTES;
  for (const g of s.ghosts) o = writeGhost(v, o, g);
  for (const c of s.coins) {
    v.setUint16(o, u16(c.x), true);
    v.setUint16(o + 2, u16(c.y), true);
    o += COIN_BYTES;
  }
  for (const f of s.offers) o = writeOffer(v, o, f);
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
  for (let i = 0; i < 4; i++) v.setUint16(23 + 2 * i, halves(s.teamSecured[i] ?? 0), true);
  v.setUint8(31, s.ghosts.length);
  v.setUint8(32, s.coins.length);
  v.setUint8(33, s.offers.length);
}

function writeGhost(v: DataView, o: number, g: GhostState): number {
  v.setUint8(o, g.id & 0xff);
  v.setUint16(o + 1, u16(g.x), true);
  v.setUint16(o + 3, u16(g.y), true);
  v.setUint8(o + 5, g.team & 0x03);
  v.setUint16(o + 6, u16(g.carried), true);
  v.setUint16(o + 8, u16(g.offSeason), true);
  v.setUint16(o + 10, halves(g.secured), true);
  v.setUint8(o + 12, g.flags & 0xff);
  return o + GHOST_BYTES;
}

function writeOffer(v: DataView, o: number, f: OfferState): number {
  v.setUint8(o, f.ghost & 0xff);
  v.setUint16(o + 1, halves(f.secureValue), true);
  v.setUint16(o + 3, u16(f.swapCoins), true);
  v.setUint16(o + 5, halves(f.swapValueNow), true);
  v.setUint16(o + 7, halves(f.swapValueLater), true);
  return o + OFFER_BYTES;
}

export function decodeState(buf: Uint8Array): ServerState {
  if (buf.byteLength < HEADER_BYTES) throw new Error('decodeState: buffer too short for header');
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const counts = [v.getUint8(31), v.getUint8(32), v.getUint8(33)] as const;
  const expected = encodedSize(...counts);
  if (buf.byteLength !== expected) {
    throw new Error(`decodeState: expected ${expected} bytes, got ${buf.byteLength}`);
  }
  let o = HEADER_BYTES;
  const ghosts: GhostState[] = [];
  for (let i = 0; i < counts[0]; i++, o += GHOST_BYTES) ghosts.push(readGhost(v, o));
  const coins: CoinState[] = [];
  for (let i = 0; i < counts[1]; i++, o += COIN_BYTES) {
    coins.push({ x: v.getUint16(o, true), y: v.getUint16(o + 2, true) });
  }
  const offers: OfferState[] = [];
  for (let i = 0; i < counts[2]; i++, o += OFFER_BYTES) offers.push(readOffer(v, o));
  return { ...readHeader(v), ghosts, coins, offers };
}

function readHeader(v: DataView): Omit<ServerState, 'ghosts' | 'coins' | 'offers'> {
  const countdown = v.getUint16(18, true);
  const team = (i: number): number => v.getUint16(23 + 2 * i, true) / 2;
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
    teamSecured: [team(0), team(1), team(2), team(3)],
  };
}

function readGhost(v: DataView, o: number): GhostState {
  return {
    id: v.getUint8(o),
    x: v.getUint16(o + 1, true),
    y: v.getUint16(o + 3, true),
    team: v.getUint8(o + 5),
    carried: v.getUint16(o + 6, true),
    offSeason: v.getUint16(o + 8, true),
    secured: v.getUint16(o + 10, true) / 2,
    flags: v.getUint8(o + 12),
  };
}

function readOffer(v: DataView, o: number): OfferState {
  return {
    ghost: v.getUint8(o),
    secureValue: v.getUint16(o + 1, true) / 2,
    swapCoins: v.getUint16(o + 3, true),
    swapValueNow: v.getUint16(o + 5, true) / 2,
    swapValueLater: v.getUint16(o + 7, true) / 2,
  };
}
