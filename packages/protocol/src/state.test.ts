// Seasonal Sumo — state encode/decode round trips and the message size against 1 KB.

import { describe, expect, it } from 'vitest';
import {
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_AIRBORNE,
  GHOST_BYTES,
  GHOST_DODGED,
  GHOST_DASHING,
  GHOST_FALLING,
  GHOST_OUT,
  GHOST_PROTECTED,
  HEADER_BYTES,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  STATE_RESULT,
  STATE_TO_END,
  decodeState,
  encodeState,
  encodedSize,
  type ServerState,
} from './state.js';

function sample(ghosts: number): ServerState {
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
    teamScore: [12, 0, 33, 7],
    mode: 1,
    livesAtStart: 3,
    area: { x: 1350, y: 650, r: 212.1 },
    next: { x: 1350, y: 1350, r: 150 },
    ghosts: Array.from({ length: ghosts }, (_, i) => ({
      id: i + 1,
      x: 100 + i,
      y: 1000 - i,
      vx: i * 30 - 400,
      vy: 900 - i * 25,
      team: i % 4,
      score: i * 300,
      dashLeftMs: (i % 8) * 200,
      // NIGHT 2026-11-18: the dodge flag (bit 128) round-trips with the rest.
      flags: i === 3 ? GHOST_AIRBORNE | GHOST_DODGED : i % 2 ? GHOST_DASHING : 0,
      lives: i % 4,
      jumpLeftMs: (i % 4) * 1000,
    })),
  };
}

describe('state encoding', () => {
  it('round-trips an empty state', () => {
    const s = sample(0);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('round-trips 32 ghosts with signed speeds, the mode, the discs, a countdown and the next-match time', () => {
    const s = { ...sample(32), countdownMs: 9000, flags: 0, nextMatchMs: 12_000 };
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES + 32 * GHOST_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('stays well under 1 KB with 32 ghosts', () => {
    expect(encodedSize(32)).toBe(558);
  });

  it('sends a missing disc as none (bomb has no arena and no zone)', () => {
    const s = { ...sample(1), mode: 2, area: null, next: null };
    expect(decodeState(encodeState(s))).toMatchObject({ mode: 2, area: null, next: null });
  });

  it('clamps out-of-range numbers instead of wrapping them', () => {
    const s = sample(1);
    const ghost = s.ghosts[0];
    if (ghost) {
      ghost.x = -5;
      ghost.vx = 1e6;
      ghost.vy = -1e6;
      ghost.score = 99_999;
    }
    const back = decodeState(encodeState(s));
    expect(back.ghosts[0]).toMatchObject({ x: 0, vx: 32767, vy: -32768, score: 65535 });
  });

  it('rejects a corrupted length', () => {
    const buf = encodeState(sample(3));
    expect(() => decodeState(buf.slice(0, buf.byteLength - 1))).toThrow();
    expect(() => decodeState(buf.slice(0, 10))).toThrow();
  });
});

describe('state flags', () => {
  it('keeps every ghost flag through a round trip', () => {
    const all =
      GHOST_BOT | GHOST_DASHING | GHOST_FALLING | GHOST_OUT | GHOST_PROTECTED | GHOST_BOMB;
    const s = sample(2);
    const [a, b] = s.ghosts;
    if (a) a.flags = all;
    if (b) b.flags = GHOST_PROTECTED;
    const back = decodeState(encodeState(s)).ghosts;
    expect(back.map((g) => g.flags)).toEqual([all, GHOST_PROTECTED]);
  });

  it('keeps the deadline flags — halving, result, to the end, match end — with the countdown', () => {
    const flags = STATE_HALVING_EVENT | STATE_RESULT | STATE_TO_END | STATE_MATCH_END_EVENT;
    const s = { ...sample(1), countdownMs: 7000, flags };
    expect(decodeState(encodeState(s))).toMatchObject({ countdownMs: 7000, flags });
  });
});
