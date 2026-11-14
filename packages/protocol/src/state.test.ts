// Seasonal Spirits — state encode/decode round trips and the message size against 1 KB.

import { describe, expect, it } from 'vitest';
import {
  COIN_BYTES,
  GHOST_BYTES,
  HEADER_BYTES,
  GHOST_CARRIER,
  STATE_HALVING_DONE,
  decodeState,
  encodeState,
  encodedSize,
  type ServerState,
} from './state.js';

function sample(ghosts: number, coins: number): ServerState {
  return {
    tick: 42,
    serverMs: 123_456,
    matchMs: 230_000,
    season: 3,
    seasonLeftMs: 70_000,
    countdownMs: null,
    flags: STATE_HALVING_DONE,
    pool: [0, 3, 17, 2],
    teamSecured: [12.5, 0, 33, 7.5],
    ghosts: Array.from({ length: ghosts }, (_, i) => ({
      id: i + 1,
      x: 100 + i,
      y: 1000 - i,
      team: i % 4,
      carried: i * 3,
      flags: i % 2 ? GHOST_CARRIER : 0,
    })),
    coins: Array.from({ length: coins }, (_, i) => ({ x: 10 * i, y: 1999 - i })),
  };
}

describe('state encoding', () => {
  it('round-trips an empty state', () => {
    const s = sample(0, 0);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('round-trips 32 ghosts, coins, pool, half-point team values and a countdown', () => {
    const s = { ...sample(32, 60), countdownMs: 9000, flags: 0 };
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES + 32 * GHOST_BYTES + 60 * COIN_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('keeps a full match state — 32 ghosts, a full field of 60 coins — under 1 KB', () => {
    expect(encodedSize(32, 60)).toBe(566);
    expect(encodedSize(32, 60)).toBeLessThan(1024);
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
    const buf = encodeState(sample(3, 2));
    expect(() => decodeState(buf.slice(0, buf.byteLength - 1))).toThrow();
    expect(() => decodeState(buf.slice(0, 10))).toThrow();
  });
});
