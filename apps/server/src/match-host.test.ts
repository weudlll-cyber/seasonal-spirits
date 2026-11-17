// Seasonal Sumo — the match host: bots fill slots, players replace them, matches and modes follow.
// Time is the dt passed in; nothing here waits.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  GAME_MODES,
  modeConfig,
  type GameConfig,
} from '@seasonal-spirits/game-core';
import {
  GHOST_BOMB,
  GHOST_BOT,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  STATE_RESULT,
  STATE_TO_END,
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

  // Owner requirement 2026-11-17: bots only fill seats; the four teams stay equal in size.
  it('keeps the teams equal: 8 seats each, humans spread evenly, a leaver back to a bot', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 32, 1);
    const teams = Array.from({ length: 8 }, (_, c) => host.join(c + 1)?.team ?? -1);
    for (let t = 0; t < 4; t++) expect(teams.filter((x) => x === t)).toHaveLength(2);
    const s = host.tick(50);
    for (let t = 0; t < 4; t++) expect(s.ghosts.filter((g) => g.team === t)).toHaveLength(8);
    host.leave(3);
    const later = runFor(host, DEFAULT_CONFIG.reconnectGraceMs + 100).at(-1);
    const humans = later?.ghosts.filter((g) => !(g.flags & GHOST_BOT)).length;
    expect(humans).toBe(7);
    expect(host.join(99)?.team).toBe(teams[2]); // the team that lost a human gets the next one
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
    const x1 =
      runFor(host, 1000)
        .at(-1)
        ?.ghosts.find((g) => g.id === slot.ghost)?.x ?? NaN;
    // Accelerating from standing with momentum: well on its way, below the top speed.
    expect(x1 - x0).toBeGreaterThan(DEFAULT_CONFIG.maxSpeed / 4);
    expect(x1 - x0).toBeLessThanOrEqual(DEFAULT_CONFIG.maxSpeed);
  });

  it('dashes once per cooldown, however often the player sends it', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 4, 1);
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    host.steer(1, 1, 0);
    const left: number[] = [];
    for (let t = 0; t < 1000; t += 50) {
      host.act(1, 'dash');
      left.push(host.tick(50).ghosts.find((g) => g.id === slot.ghost)?.dashLeftMs ?? -1);
    }
    // The cooldown ran once from the first dash and was never restarted.
    expect(left[0]).toBeGreaterThan(DEFAULT_CONFIG.dashCooldownMs - 100);
    expect(left.every((v, i) => i === 0 || v <= (left[i - 1] ?? Infinity))).toBe(true);
  });
});

describe('match host state size', () => {
  // A whole match: about 1–2 s alone, more beside the rest of the suite on a busy machine.
  it(
    'never sends more than 1 KB in a whole 32-bot match, the halvings included',
    {
      timeout: 20_000,
    },
    () => {
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
      // The state has no variable part but the ghosts: 45 + 14 · 32.
      expect(max).toBe(encodedSize(32));
    },
  );
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

  it('counts down to the match end in the last season and flags the end in one state', () => {
    const host = new MatchHost(DEFAULT_CONFIG, 8, 1);
    const states = runFor(host, DEFAULT_CONFIG.matchDurationMs + 1000);
    const lastSeason = 3 * DEFAULT_CONFIG.seasonDurationMs;
    const toEnd = states.filter((s) => s.flags & STATE_TO_END);
    expect(toEnd.every((s) => s.matchMs >= lastSeason && s.matchMs < 300_000)).toBe(true);
    expect(toEnd).toHaveLength(DEFAULT_CONFIG.seasonDurationMs / 50);
    const lastTen = toEnd.filter((s) => s.countdownMs !== null).map((s) => s.matchMs);
    expect([lastTen[0], lastTen.at(-1)]).toEqual([290_000, 299_950]);
    const ends = states.filter((s) => s.flags & STATE_MATCH_END_EVENT);
    expect(ends.map((s) => [s.matchMs, s.countdownMs, s.flags & STATE_RESULT])).toEqual([
      [300_000, null, STATE_RESULT],
    ]);
  });

  it('rotates the modes match by match when asked, each with its own rules and bots', () => {
    const short = { ...DEFAULT_CONFIG, seasonDurationMs: 250, matchDurationMs: 1000 };
    const host = new MatchHost({ ...short, resultPauseMs: 500 }, 8, 1, GAME_MODES);
    const modes: number[] = [];
    let carriers = new Set<number>();
    const hill = modeConfig(DEFAULT_CONFIG, 'hill').matchDurationMs;
    for (const s of runFor(host, 1000 + 500 + hill + 500 + 1000)) {
      if (modes.at(-1) !== s.mode) modes.push(s.mode);
      if (s.mode === 2)
        carriers = new Set(s.ghosts.filter((g) => g.flags & GHOST_BOMB).map((g) => g.id));
      // Sumo and hill draw a disc, bomb none.
      expect(s.area === null, `mode ${s.mode}`).toBe(s.mode === 2);
    }
    expect(modes).toEqual([0, 1, 2]);
    expect(carriers.size).toBe(1); // 8 players: one bomb
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
