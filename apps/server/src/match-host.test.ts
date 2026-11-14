// Seasonal Spirits — the match host: bots fill slots, players replace them, matches follow.
// Time is the dt passed in; nothing here waits.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameConfig } from '@seasonal-spirits/game-core';
import {
  GHOST_BOT,
  STATE_HALVING_EVENT,
  STATE_RESULT,
  encodeState,
  encodedSize,
} from '@seasonal-spirits/protocol';
import { MatchHost, type WireState } from './match-host.js';

const isBot = (s: WireState, id: number): boolean =>
  ((s.ghosts.find((g) => g.id === id)?.flags ?? 0) & GHOST_BOT) !== 0;

function runFor(host: MatchHost, ms: number): WireState[] {
  const out: WireState[] = [];
  for (let t = 0; t < ms; t += 50) out.push(host.tick(50));
  return out;
}

describe('match host slots', () => {
  it('fills every slot with a bot until a player joins', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 32, 1);
    const s = host.tick(50);
    expect(s.ghosts).toHaveLength(32);
    expect(s.ghosts.every((g) => g.flags & GHOST_BOT)).toBe(true);
  });

  it('lets a joining player replace a bot, spreading players over the teams', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 32, 1);
    const teams = [1, 2, 3, 4].map((client) => host.join(client)?.team);
    expect(new Set(teams)).toEqual(new Set([0, 1, 2, 3]));
    expect(host.players()).toBe(4);
  });

  it('refuses a player when every slot has one', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 4, 1);
    for (let c = 1; c <= 4; c++) expect(host.join(c)).not.toBeNull();
    expect(host.join(5)).toBeNull();
  });

  it('keeps a left player’s ghost standing for the grace time, then a bot takes over', () => {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, reconnectGraceMs: 12_000 };
    const host = new MatchHost(cfg, 4, 1);
    const slot = host.join(7);
    if (!slot) throw new Error('no slot');
    host.leave(7);
    const standing = runFor(host, 11_950).at(-1);
    if (!standing) throw new Error('no state');
    expect(isBot(standing, slot.ghost)).toBe(false);
    expect(host.players()).toBe(0);
    expect(isBot(host.tick(50), slot.ghost)).toBe(true);
  });
});

describe('match host inputs', () => {
  it('moves the player’s ghost by its direction and ignores other clients', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 4, 1);
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    const x0 = host.tick(50).ghosts.find((g) => g.id === slot.ghost)?.x ?? NaN;
    host.steer(2, -1, 0); // not a player
    host.steer(1, 1, 0);
    const x1 = host.tick(1000).ghosts.find((g) => g.id === slot.ghost)?.x ?? NaN;
    expect(x1 - x0).toBeCloseTo(DEFAULT_CONFIG.ghostSpeed);
  });
});

describe('match host state size', () => {
  it('never sends more than 1 KB in a whole 32-bot match, the halvings included', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 32, 1);
    let max = 0;
    let halvings = 0;
    for (const s of runFor(host, DEFAULT_CONFIG.matchDurationMs)) {
      const bytes = encodeState({ ...s, tick: 0, serverMs: 0 }).byteLength;
      max = Math.max(max, bytes);
      if (s.flags & STATE_HALVING_EVENT) halvings++;
    }
    expect(halvings).toBe(3);
    expect(max).toBeLessThan(1024);
    // A full field (maxFieldCoins) is the upper bound: 30 + 9 · 32 + 4 · 60 bytes.
    expect(max).toBeLessThanOrEqual(encodedSize(32, DEFAULT_CONFIG.maxFieldCoins));
  });
});

describe('match host lifecycle', () => {
  it('flags each of the three halvings in exactly one tick, with the new season', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 8, 1);
    const states = runFor(host, DEFAULT_CONFIG.matchDurationMs);
    const flagged = states.filter((s) => s.flags & STATE_HALVING_EVENT);
    expect(flagged.map((s) => [s.matchMs, s.season])).toEqual([
      [75_000, 1],
      [150_000, 2],
      [225_000, 3],
    ]);
  });

  it('shows the result for the pause, then starts the next match with the same players', () => {
    const cfg: GameConfig = { ...DEFAULT_CONFIG, resultPauseMs: 15_000 };
    const host = new MatchHost(cfg, 8, 1);
    host.join(1);
    const states = runFor(host, cfg.matchDurationMs + cfg.resultPauseMs + 100);
    const results = states.filter((s) => s.flags & STATE_RESULT);
    expect(results.length).toBe(cfg.resultPauseMs / 50);
    const next = states.at(-1);
    expect(next?.flags ?? STATE_RESULT).toBe(0);
    expect(next?.matchMs).toBeLessThanOrEqual(150);
    expect(host.players()).toBe(1);
  });
});
