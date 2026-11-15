// Seasonal Spirits — the match host: bots fill slots, players replace them, matches follow.
// Time is the dt passed in; nothing here waits.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameConfig } from '@seasonal-spirits/game-core';
import {
  GHOST_AT_SHRINE,
  GHOST_BOT,
  GHOST_CAN_STEAL,
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

describe('match host shrine offers', () => {
  it('sends the button numbers for a player in its own shrine, never for a bot', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 4, 1);
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    // Every ghost starts inside its own shrine.
    const s = host.tick(50);
    expect(s.ghosts.every((g) => g.flags & GHOST_AT_SHRINE)).toBe(true);
    expect(s.offers).toEqual([
      { ghost: slot.ghost, secureValue: 0, swapCoins: 0, swapValueNow: 0, swapValueLater: 0 },
    ]);
    host.steer(1, 1, 1);
    expect(host.tick(1000).offers).toEqual([]);
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
    // Bots never get offers: a full field (maxFieldCoins) is the bound, 34 + 13 · 32 + 4 · 60.
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

// Owner's observation 2026-11-15: stealing was not understood. The staged situation puts the
// player beside an opponent hunter with nothing (scenario.ts).
describe('match host steal feedback', () => {
  const canSteal = (s: WireState, ghost: number): boolean =>
    ((s.ghosts.find((g) => g.id === ghost)?.flags ?? 0) & GHOST_CAN_STEAL) !== 0;

  it('tells a player robbed by a bot, and only that player', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 12, 1, 'steal');
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    const notices = [];
    for (let t = 0; t < 2000; t += 50) {
      host.tick(50);
      notices.push(...host.stealNotices());
    }
    expect(notices.length).toBeGreaterThan(0);
    expect(notices.every((n) => n.clientId === 1)).toBe(true);
    expect(notices[0]?.message).toMatchObject({ kind: 'steal', victim: slot.ghost });
  });

  it('lights the Steal flag only while a steal would take something, and tells the thief', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 12, 1, 'steal');
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    // The hunter robs the player first; then the player has a carrier in range.
    let s = host.tick(50);
    for (let t = 0; t < 2000 && !canSteal(s, slot.ghost); t += 50) s = host.tick(50);
    expect(canSteal(s, slot.ghost)).toBe(true);
    host.act(1, 'steal');
    host.tick(50);
    const notices = host.stealNotices();
    expect(notices).toHaveLength(1);
    expect(notices[0]?.clientId).toBe(1);
    expect(notices[0]?.message.thief).toBe(slot.ghost);
    // Right after the steal the cooldown runs: the flag is off.
    expect(canSteal(host.tick(50), slot.ghost)).toBe(false);
  });

  it('sends no notice to anyone for steals among bots', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 32, 1);
    for (let t = 0; t < 60_000; t += 50) {
      host.tick(50);
      expect(host.stealNotices()).toEqual([]);
    }
  });
});
