// Seasonal Spirits — interpolation + extrapolation tests.

import { describe, expect, it } from 'vitest';
import { interpolate, type BufferedState } from './interpolation.js';

function s(serverMs: number, x: number, y: number): BufferedState {
  return {
    receivedAt: serverMs, // irrelevant for interpolate; included for completeness
    state: {
      tick: serverMs,
      serverMs,
      matchMs: serverMs,
      season: 0,
      seasonNumber: 0,
      seasonLeftMs: 75_000,
      countdownMs: null,
      flags: 0,
      nextMatchMs: 0,
      teamSecured: [0, 0, 0, 0],
      ghosts: [{ id: 1, x, y, team: 0, carried: 0, offSeason: 0, secured: 0, flags: 0 }],
      coins: [],
      offers: [],
    },
  };
}

describe('interpolate', () => {
  it('returns the midpoint between two states', () => {
    const buffer = [s(0, 0, 0), s(100, 100, 0)];
    const r = interpolate(buffer, 50);
    expect(r.underrun).toBe(false);
    expect(r.ghosts[0]?.x).toBeCloseTo(50);
  });

  it('extrapolates beyond the newest state and flags an underrun', () => {
    const buffer = [s(0, 0, 0), s(100, 100, 0)];
    const r = interpolate(buffer, 200); // target beyond newest 100
    expect(r.underrun).toBe(true);
    expect(r.ghosts[0]?.x).toBeCloseTo(200);
  });

  it('returns the only state as-is and flags an underrun', () => {
    const r = interpolate([s(0, 42, 7)], 500);
    expect(r.underrun).toBe(true);
    expect(r.ghosts[0]?.x).toBe(42);
    expect(r.ghosts[0]?.y).toBe(7);
  });
});
