// Seasonal Spirits — state encode/decode round trips and the message size against 1 KB.

import { describe, expect, it } from 'vitest';
import {
  COIN_BYTES,
  GHOST_AT_SHRINE,
  GHOST_BOT,
  GHOST_BYTES,
  GHOST_CARRIER,
  GHOST_SECURING,
  HEADER_BYTES,
  OFFER_BYTES,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  STATE_RESULT,
  STATE_TO_END,
  decodeState,
  encodeState,
  encodedSize,
  type ServerState,
} from './state.js';

function sample(ghosts: number, coins: number, offers = 0): ServerState {
  return {
    tick: 42,
    serverMs: 123_456,
    matchMs: 230_000,
    season: 3,
    seasonNumber: 3,
    seasonLeftMs: 70_000,
    countdownMs: null,
    flags: STATE_HALVING_EVENT,
    nextMatchMs: 0,
    teamSecured: [12.5, 0, 33, 7.5],
    ghosts: Array.from({ length: ghosts }, (_, i) => ({
      id: i + 1,
      x: 100 + i,
      y: 1000 - i,
      team: i % 4,
      carried: i * 3,
      offSeason: i,
      secured: i / 2,
      flags: i % 2 ? GHOST_CARRIER | GHOST_AT_SHRINE : 0,
    })),
    coins: Array.from({ length: coins }, (_, i) => ({ x: 10 * i, y: 1999 - i })),
    offers: Array.from({ length: offers }, (_, i) => ({ ghost: i + 1, secureValue: 12.5 })),
  };
}

describe('state encoding', () => {
  it('round-trips an empty state', () => {
    const s = sample(0, 0);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('round-trips 32 ghosts, coins, offers, half values, a countdown and the next-match time', () => {
    const s = { ...sample(32, 60, 4), countdownMs: 9000, flags: 0, nextMatchMs: 12_000 };
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(
      HEADER_BYTES + 32 * GHOST_BYTES + 60 * COIN_BYTES + 4 * OFFER_BYTES,
    );
    expect(decodeState(buf)).toEqual(s);
  });

  it('stays under 1 KB at the worst case: 32 ghosts, a full field of 60 coins, 32 offers', () => {
    expect(encodedSize(32, 60, 32)).toBe(786);
    expect(encodedSize(32, 60, 32)).toBeLessThan(1024);
  });

  it('clamps out-of-range numbers instead of wrapping them', () => {
    const s = sample(1, 0);
    const ghost = s.ghosts[0];
    if (ghost) {
      ghost.x = -5;
      ghost.carried = 1e6;
    }
    const back = decodeState(encodeState(s));
    expect(back.ghosts[0]).toMatchObject({ x: 0, carried: 65535 });
  });

  it('rejects a corrupted length', () => {
    const buf = encodeState(sample(3, 2, 1));
    expect(() => decodeState(buf.slice(0, buf.byteLength - 1))).toThrow();
    expect(() => decodeState(buf.slice(0, 10))).toThrow();
  });
});

describe('state flags', () => {
  it('keeps every ghost flag through a round trip', () => {
    const all = GHOST_CARRIER | GHOST_SECURING | GHOST_BOT | GHOST_AT_SHRINE;
    const s = sample(2, 0);
    const [a, b] = s.ghosts;
    if (a) a.flags = all;
    if (b) b.flags = GHOST_BOT;
    const back = decodeState(encodeState(s)).ghosts;
    expect(back.map((g) => g.flags)).toEqual([all, GHOST_BOT]);
  });

  it('keeps the deadline flags — halving, result, to the end, match end — with the countdown', () => {
    const flags = STATE_HALVING_EVENT | STATE_RESULT | STATE_TO_END | STATE_MATCH_END_EVENT;
    const s = { ...sample(1, 0), countdownMs: 7000, flags };
    expect(decodeState(encodeState(s))).toMatchObject({ countdownMs: 7000, flags });
    const toEnd = { ...sample(1, 0), countdownMs: 0, flags: STATE_TO_END };
    expect(decodeState(encodeState(toEnd))).toMatchObject({ countdownMs: 0, flags: STATE_TO_END });
  });
});
