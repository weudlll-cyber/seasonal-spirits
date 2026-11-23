// Seasonal Sumo — the match host: bots fill seats, players replace them, matches, modes and
// sumo's variants follow the rotation, a change of the settings applies in the running match
// (lives, the variant and the seats from the next). Time is the dt passed in; nothing waits.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  DEFAULT_SETTINGS,
  configFrom,
  type Settings,
} from '@seasonal-spirits/game-core';
import {
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_FALLING,
  GHOST_NO_RETURN,
  STATE_HALVING_EVENT,
  STATE_LAST_STANDING,
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

// A host with the default settings, `over` changed, and `seats` seats (four per team size).
function hostOf(seats: number, over: Partial<Settings> = {}): MatchHost {
  return new MatchHost({ ...DEFAULT_SETTINGS, teamSize: seats / 4, ...over }, 1);
}

// Short sumo matches: four seasons of 0.25 s.
const SHORT: Partial<Settings> = { sumoSeason: 0.25, sumoMatch: 1 };

describe('match host slots', () => {
  it('fills every slot with a bot until a player joins', () => {
    const host = hostOf(32);
    const s = host.tick(50);
    expect(s.ghosts).toHaveLength(32);
    expect(s.ghosts.every((g) => g.flags & GHOST_BOT)).toBe(true);
  });

  it('lets a joining player replace a bot, spreading players over the teams', () => {
    const host = hostOf(32);
    const teams = [1, 2, 3, 4].map((client) => host.join(client)?.team);
    expect(new Set(teams)).toEqual(new Set([0, 1, 2, 3]));
    expect(host.players()).toBe(4);
  });

  // Owner requirement 2026-11-17: bots only fill seats; the four teams stay equal in size.
  it('keeps the teams equal: 8 seats each, humans spread evenly, a leaver back to a bot', () => {
    const host = hostOf(32);
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
    const host = hostOf(4);
    for (let c = 1; c <= 4; c++) expect(host.join(c)).not.toBeNull();
    expect(host.join(5)).toBeNull();
  });

  it('keeps a left player’s ghost standing for the grace time, then a bot takes over', () => {
    const host = hostOf(4, { reconnectGrace: 12 });
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

describe('match host seat handover', () => {
  // 2026-11-18: a player inherited the cooldowns of a bot that had just dashed or jumped.
  it('gives a taken-over seat ready dash and jump, and keeps its place, lives, score and team', () => {
    const host = hostOf(4);
    // The bot in the first seat in a cooldown — a dash or a jump; neither may come along.
    const busy = (s: WireState) => {
      const g = s.ghosts[0];
      return g !== undefined && (g.dashLeftMs > 0 || g.jumpLeftMs > 0);
    };
    let before = host.tick(50);
    for (let t = 0; t < 60_000 && !busy(before); t += 50) before = host.tick(50);
    const seat = before.ghosts[0];
    if (!seat || !busy(before)) throw new Error('the bot never dashed or jumped');
    const slot = host.join(1);
    expect(slot?.ghost).toBe(seat.id); // the first seat of the team with the fewest players
    const after = host.tick(0).ghosts.find((g) => g.id === seat.id);
    expect([after?.dashLeftMs, after?.jumpLeftMs]).toEqual([0, 0]);
    expect(after).toMatchObject({ x: seat.x, y: seat.y, lives: seat.lives, score: seat.score });
    expect(after?.team).toBe(seat.team);
  });
});

describe('match host inputs', () => {
  it('moves the player’s ghost by its direction and ignores other clients', () => {
    const host = hostOf(4);
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
    const host = hostOf(4);
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
  // A whole match with every halving, in 5 s seasons and with lives enough to reach its end: the
  // state's size is the ghosts' count, not the time (night chain 2026-11-22/23, piece 6: the 5:00
  // match took 21–61 s under load).
  it(
    'never sends more than 1 KB in a whole 32-bot match, the halvings included',
    {
      timeout: 20_000,
    },
    () => {
      const host = hostOf(32, { sumoSeason: 5, sumoMatch: 20, lives: 99 });
      let max = 0;
      let halvings = 0;
      for (const s of runFor(host, 20_000)) {
        const bytes = encodeState({ ...s, tick: 0, serverMs: 0 }).byteLength;
        max = Math.max(max, bytes);
        if (s.flags & STATE_HALVING_EVENT) halvings++;
      }
      expect(halvings).toBe(3);
      expect(max).toBeLessThan(1024);
      // The state has no variable part but the ghosts: 46 + 16 · 32.
      expect(max).toBe(encodedSize(32));
    },
  );
});

// The clock over a whole match: lives enough that no early end cuts it short (LIVES and FIX
// 2026-11-17: with 3 lives the bots may knock out all but one team before 5:00).
const CLOCK: Partial<Settings> = { lives: 99 };

// That whole match and a second after it, played once for the two tests that read its clock.
let clockMatch: WireState[] | null = null;
const clockStates = (): WireState[] =>
  (clockMatch ??= runFor(hostOf(8, CLOCK), DEFAULT_CONFIG.matchDurationMs + 1000));

describe('match host lifecycle', () => {
  it('flags each of the three halvings in exactly one tick, with the new season', () => {
    const states = clockStates();
    const flagged = states.filter((s) => s.flags & STATE_HALVING_EVENT);
    expect(flagged.map((s) => [s.matchMs, s.season])).toEqual([
      [75_000, 1],
      [150_000, 2],
      [225_000, 3],
    ]);
  });

  it('counts down to the match end in the last season and flags the end in one state', () => {
    const states = clockStates();
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

  it('rotates the modes match by match as the rotation asks, each with its own rules and bots', () => {
    const rotation = { rotation1: 1, rotation2: 4, rotation3: 5 }; // Sumo, King, Bomb
    // King at its shortest match, 1:00 (the rotation turns at its end, not at its length).
    const quickHill = { hillMatch: 60, hillJump: 15 };
    const host = hostOf(8, { ...SHORT, resultPause: 0.5, ...rotation, ...quickHill });
    const modes: number[] = [];
    let carriers = new Set<number>();
    const hill = configFrom({ ...DEFAULT_SETTINGS, ...quickHill }, 'hill').matchDurationMs;
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
    const pauseMs = 15_000;
    const host = hostOf(8, { ...SHORT, resultPause: pauseMs / 1000 });
    host.join(1);
    const states = runFor(host, 1000 + pauseMs + 100);
    // A short match (SHORT), or one ended early by lives: the pause follows its end either way.
    const end = states.findIndex((s) => s.flags & STATE_MATCH_END_EVENT);
    const pause = pauseMs / 50;
    const after = states.slice(end, end + pause + 1);
    expect(after.slice(0, pause).every((s) => s.flags & STATE_RESULT)).toBe(true);
    const next = after.at(-1);
    expect(next?.flags ?? STATE_RESULT).toBe(0);
    expect(next?.matchMs).toBe(50);
    expect(host.players()).toBe(1);
  });
});

// The panel rebuild (2026-11-18): the admin panel starts a chosen game with its settings.
describe('match host started game', () => {
  const BOMB = { mode: 'bomb', variant: 'points' } as const;
  // A short Bomb match (its least length), a short pause; the rotation is Sumo alone.
  const QUICK: Settings = { ...DEFAULT_SETTINGS, teamSize: 2, bombMatch: 60, resultPause: 3 };
  const modeAfter = (host: MatchHost, ms: number): number => runFor(host, ms).at(-1)?.mode ?? -1;

  it('ends the running match at once and starts the game with the sent settings', () => {
    const host = hostOf(8);
    runFor(host, 1000);
    host.startGame(BOMB, { ...QUICK, perBomb: 2 }, false);
    const s = host.tick(50);
    expect([s.mode, s.matchMs, s.flags & (STATE_RESULT | STATE_MATCH_END_EVENT)]).toEqual([
      2, 50, 0,
    ]);
    expect(host.recapNow(false)).toBeNull(); // no result, no recap
    expect(host.settingsInForce().perBomb).toBe(2);
    expect(s.ghosts.filter((g) => g.flags & GHOST_BOMB)).toHaveLength(4); // 8 players, 2 per bomb
  });

  // 2026-11-19: the return lock on the wire — the giver of a pass carries GHOST_NO_RETURN for
  // the lock's time (passBack, 1 s: twenty 50 ms ticks), then no more.
  it('marks the giver of a bomb pass "no return" for exactly the lock', () => {
    const host = hostOf(8);
    host.startGame(BOMB, { ...QUICK, perBomb: 2 }, false);
    const runs: number[] = []; // per locked stretch of one ghost, its length in ticks
    const open = new Map<number, number>();
    for (const s of runFor(host, 20_000)) {
      for (const g of s.ghosts) {
        const locked = (g.flags & GHOST_NO_RETURN) !== 0;
        const ticks = open.get(g.id);
        if (locked) open.set(g.id, (ticks ?? 0) + 1);
        else if (ticks !== undefined) {
          runs.push(ticks);
          open.delete(g.id);
        }
      }
    }
    expect(runs.length).toBeGreaterThan(3);
    // A lock ends early only when the same bomb is passed on again by the one who took it.
    expect(Math.max(...runs)).toBe(QUICK.passBack * 20);
  });

  it('goes on with the rotation afterwards, or keeps the game while the switch is on', () => {
    const once = hostOf(8);
    once.startGame(BOMB, QUICK, false);
    expect(modeAfter(once, 60_000 + 3000 + 100)).toBe(0); // Sumo again
    const kept = hostOf(8);
    kept.startGame(BOMB, QUICK, true);
    expect(kept.keeping()).toBe(true);
    expect(modeAfter(kept, 60_000 + 3000 + 100)).toBe(2); // Bomb again
    kept.keepGame(false);
    expect(modeAfter(kept, 60_000 + 3000 + 100)).toBe(0);
  });
});

// LIVES 2026-11-17: Points and Last One Standing in turn; a ghost out of lives is not handed
// to a joining player while one with lives is free.
describe('match host sumo variants and lives', () => {
  it('alternates Points and Last One Standing match by match, Points first', () => {
    const host = hostOf(8, { ...SHORT, resultPause: 0.5, variant: 2 }); // alternate
    const variants: number[] = [];
    for (const s of runFor(host, 3 * 1500)) {
      const v = s.flags & STATE_LAST_STANDING;
      if (!(s.flags & STATE_RESULT) && variants.at(-1) !== v) variants.push(v);
    }
    expect(variants.slice(0, 3)).toEqual([0, STATE_LAST_STANDING, 0]);
  });

  it('takes lives and the variant from the next match on, the halving setting at once', () => {
    const start = { ...DEFAULT_SETTINGS, teamSize: 2, ...SHORT, resultPause: 0.5 };
    const host = new MatchHost(start, 1);
    host.tick(50);
    host.tune({ ...start, lives: 5, variant: 1, afterLast: 1 });
    const running = host.tick(50);
    expect(running.livesAtStart).toBe(3);
    expect(running.flags & STATE_LAST_STANDING).toBe(0);
    const next = runFor(host, 1500).at(-1);
    expect(next?.livesAtStart).toBe(5);
    expect(next?.ghosts.every((g) => g.lives === 5)).toBe(true);
    expect((next?.flags ?? 0) & STATE_LAST_STANDING).toBe(STATE_LAST_STANDING);
    // keep-halving holds already: no time limit, the countdown runs to a halving.
    const later = runFor(host, 1200).at(-1);
    expect(later?.matchMs).toBeGreaterThan(1000);
    expect((later?.flags ?? 0) & STATE_TO_END).toBe(0);
  });

  it('gives a joining player a ghost with lives left while there is one', () => {
    const host = hostOf(8, { ...SHORT, sumoMatch: 600, lives: 1 });
    let s = host.tick(50);
    while (!s.ghosts.some((g) => g.lives === 0) && s.matchMs < 600_000) s = host.tick(50);
    const out = s.ghosts.filter((g) => g.lives === 0).map((g) => g.id);
    expect(out.length).toBeGreaterThan(0);
    const slot = host.join(1);
    expect(out).not.toContain(slot?.ghost);
    expect(host.tick(50).ghosts.find((g) => g.id === slot?.ghost)?.lives).toBe(1);
  });
});

// TUNE 2026-11-17: the owner's sliders change the running match, not only the next one.
describe('match host live tuning', () => {
  it('eases the running arena to the new size and walks the ghosts at the new top speed', () => {
    const startRadius = DEFAULT_CONFIG.arenaRadius;
    const host = hostOf(4);
    const slot = host.join(1);
    if (!slot) throw new Error('no slot');
    host.tick(50);
    const faster = { arenaRadius: 600, maxSpeed: 400, dashSpeed: 800, knockSpeed: 500 };
    host.tune({ ...DEFAULT_SETTINGS, teamSize: 1, ...faster });
    host.steer(1, 1, 0);
    const states = runFor(host, 1000);
    const own = states.at(-1)?.ghosts.find((g) => g.id === slot.ghost);
    expect(own?.vx).toBeGreaterThan(DEFAULT_CONFIG.maxSpeed * 1.2);
    expect(states[0]?.area?.r).toBeLessThan(500); // eases in, no jump
    const settled = runFor(host, DEFAULT_CONFIG.arenaShrinkMs).at(-1);
    expect(settled?.area?.r).toBeCloseTo(600);
    expect(DEFAULT_CONFIG.arenaRadius).toBe(startRadius); // the host tuned its own copy
  });

  // FIX 2026-11-17-3: shrinking the arena with the slider throws nobody off.
  it('carries the ghosts inward with the edge when the arena slider shrinks it', () => {
    const host = hostOf(32);
    host.tick(50);
    const small = DEFAULT_CONFIG.arenaRadius / 2;
    host.tune({ ...DEFAULT_SETTINGS, arenaRadius: small });
    // Standing still (every seat a player holding nothing): only the edge moves them.
    for (let c = 1; c <= 32; c++) host.join(c);
    const states = runFor(host, DEFAULT_CONFIG.arenaShrinkMs + 500);
    expect(states.at(-1)?.area?.r).toBeCloseTo(small);
    for (const s of states) expect(s.ghosts.every((g) => !(g.flags & GHOST_FALLING))).toBe(true);
  });
});

// NIGHT 2026-11-18: the seats follow the team size from the next match; a player keeps theirs.
describe('match host seats', () => {
  it('seats the new team size at the next match, keeping the players', () => {
    const start = { ...DEFAULT_SETTINGS, teamSize: 2, ...SHORT, resultPause: 0.5 };
    const host = new MatchHost(start, 1);
    const slot = host.join(1);
    host.tune({ ...start, teamSize: 3 });
    expect(host.tick(50).ghosts).toHaveLength(8); // the running match keeps its seats
    const next = runFor(host, 1500).at(-1);
    expect(next?.ghosts).toHaveLength(12);
    expect(next?.ghosts.some((g) => g.id === slot?.ghost && !(g.flags & GHOST_BOT))).toBe(true);
  });
});
