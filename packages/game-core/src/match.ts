// Seasonal Sumo — one match of any game mode: the pure, deterministic core driven by tick(dt).
// No clock and no randomness of its own: time is the sum of the dt values it is given and
// every random value comes from the seed, so the same seed and intents give the same match.
// The shared physics live here once; the mode's own rules come from modes/rules.ts, sumo's
// variants — lives, the end, the winner — from standing.ts.

import { followEdge, newArena, scaleArena, startSpot, updateArena } from './arena.js';
import { collideGhosts } from './collisions.js';
import { walled, type GameConfig, type SumoVariant } from './config.js';
import { advancePhases } from './falls.js';
import { dashVelocity, moveOnce, subSteps } from './geometry.js';
import { rulesFor, scoreOf, type ModeRules } from './modes/rules.js';
import { mulberry32 } from './rng.js';
import { seasonClock } from './seasons.js';
import { clockOf, decide, isOver, nextDeadline, noteKnockedOut, timed } from './standing.js';
import {
  IDLE,
  TEAMS,
  type Ghost,
  type Intent,
  type MatchResult,
  type MatchState,
  type Team,
} from './types.js';

export interface Roster {
  id: number;
  team: Team;
}

export class Match {
  readonly cfg: GameConfig;
  private readonly s: MatchState;
  private readonly rng: () => number;
  private readonly rules: ModeRules;

  // `variant`: sumo's for this match (the server's choice); the walled modes play "points".
  constructor(
    cfg: GameConfig,
    seed: number,
    roster: readonly Roster[],
    variant: SumoVariant = 'points',
  ) {
    this.cfg = cfg;
    // The match's one seeded random source: respawn spots (arena.ts respawnSpot), the bombs.
    this.rng = mulberry32(seed);
    this.rules = rulesFor(cfg);
    const arena = newArena(cfg);
    const sorted = [...roster].sort((a, b) => a.id - b.id);
    const ghosts = sorted.map((r) => {
      const mates = sorted.filter((m) => m.team === r.team);
      const p = startSpot(cfg, arena, r.team, { index: mates.indexOf(r), of: mates.length });
      return newGhost(r, p, cfg.sumo.lives);
    });
    this.s = {
      mode: cfg.mode,
      variant: cfg.mode === 'sumo' ? variant : 'points',
      livesAtStart: cfg.sumo.lives,
      elapsedMs: 0,
      tick: 0,
      clock: seasonClock(cfg, 0),
      lastHalvingMs: 0,
      countdownMs: null,
      ended: false,
      arena,
      zone: null,
      bombs: [],
      ghosts,
      knockedOut: [],
      winner: null,
      lastStanding: null,
      events: [],
    };
    this.rules.start(this.s, this.rng);
  }

  get state(): Readonly<MatchState> {
    return this.s;
  }

  // One step. Order: time and season (a season turn is the mode's halving), the arena's edge,
  // falls ending and respawns, each ghost's dash (by id), movement and collisions in sub-steps,
  // the mode's rules (sumo: new falls; hill: the zone's points; bomb: points and passes), the
  // teams knocked out, the end and its winner, the countdown. Intents of unknown ids are ignored.
  tick(dtMs: number, intents: ReadonlyMap<number, Intent>): Readonly<MatchState> {
    const s = this.s;
    s.events = [];
    if (s.ended || !(dtMs > 0)) return s;
    this.advanceTime(dtMs);
    const before = s.arena.radius;
    updateArena(this.cfg, s.arena, s.elapsedMs);
    followEdge(s, before);
    advancePhases(this.cfg, s, this.rng);
    for (const g of s.ghosts) this.dash(g, intents.get(g.id) ?? IDLE);
    // Sub-steps: every ghost moves a short way, then the contacts are resolved — so a ghost that
    // reaches another always touches it, however fast it goes (FIX 2026-11-17-3).
    const n = subSteps(this.cfg, dtMs);
    for (let i = 0; i < n; i++) {
      for (const g of s.ghosts) this.move(g, intents.get(g.id) ?? IDLE, dtMs / n);
      collideGhosts(this.cfg, s);
    }
    this.rules.after(s, dtMs);
    this.finish();
    return s;
  }

  // Time runs on — up to the time limit when the match has one — and the season clock with it;
  // a season turn is a halving (standing.ts clockOf: also keep-halving's after the last season).
  private advanceTime(dtMs: number): void {
    const s = this.s;
    const before = s.clock.index;
    const end = timed(this.cfg, s) ? this.cfg.matchDurationMs : Infinity;
    s.elapsedMs = Math.max(s.elapsedMs, Math.min(end, s.elapsedMs + dtMs));
    s.tick++;
    s.clock = clockOf(this.cfg, s);
    if (s.clock.index > before) {
      s.lastHalvingMs = s.elapsedMs;
      s.events.push({ type: 'halving', atMs: s.elapsedMs, season: s.clock.current });
      this.rules.turn(s, this.rng);
    }
  }

  // The teams knocked out, the end and its winner, and the countdown.
  private finish(): void {
    const s = this.s;
    noteKnockedOut(s);
    s.ended = isOver(this.cfg, s);
    if (s.ended) {
      Object.assign(s, decide(s));
      s.events.push({ type: 'match-end', atMs: s.elapsedMs });
    }
    // One countdown for every deadline: before each halving, and in the last season before
    // the match end (the server tells the clients which one); none without a deadline.
    const left = s.clock.timeLeftMs;
    const due = !s.ended && nextDeadline(this.cfg, s) !== null;
    s.countdownMs = due && left <= this.cfg.deadlineCountdownMs ? left : null;
  }

  // A player takes over a ghost a bot steered: it starts from standing, not with the bot's
  // momentum (the server calls this on a join).
  halt(id: number): void {
    const g = this.s.ghosts.find((x) => x.id === id);
    if (g) Object.assign(g, { vx: 0, vy: 0, dashUntilMs: 0, knockedUntilMs: 0 });
  }

  // The owner's live tuning changed the arena's starting size (development only): the running
  // arena eases to the same share of the new size and carries the ghosts with its edge, so
  // nobody falls by a slider (followEdge); inside the walls of hill and bomb nothing changes.
  rescaleArena(factor: number): void {
    if (!walled(this.cfg)) scaleArena(this.s.arena, factor, this.s.elapsedMs, true);
  }

  // Each player's counts and its score in the mode, the scores and the ghosts still in summed
  // per team, the teams knocked out and the winner; a ghost's longest stretch without a fall
  // counts the one it is in at the end too.
  result(): MatchResult {
    const s = this.s;
    const mode = this.cfg.mode;
    const teams = TEAMS.map(() => 0);
    const left = TEAMS.map(() => 0);
    const players = s.ghosts.map((g) => {
      const score = scoreOf(mode, g);
      teams[g.team] = (teams[g.team] ?? 0) + score;
      if (g.lives > 0) left[g.team] = (left[g.team] ?? 0) + 1;
      const running = g.phase === 'in' ? s.elapsedMs - g.aliveSinceMs : 0;
      const { id, team, knockouts, falls, lives, scoreMs, bounces, passes } = g;
      const longestAliveMs = Math.max(g.longestAliveMs, running);
      return { id, team, score, knockouts, falls, lives, longestAliveMs, scoreMs, bounces, passes };
    });
    const { variant, winner, lastStanding } = s;
    const knockedOut = [...s.knockedOut];
    return { mode, variant, players, teams, left, knockedOut, winner, lastStanding };
  }

  // A ghost on the arena may dash, once per tick (the cooldown is the core's: a dash before
  // dashReadyMs does nothing).
  private dash(g: Ghost, intent: Intent): void {
    const now = this.s.elapsedMs;
    if (g.phase !== 'in' || intent.action !== 'dash' || now < g.dashReadyMs) return;
    const v = dashVelocity(this.cfg, g, intent);
    if (!v) return;
    g.vx = v.x;
    g.vy = v.y;
    g.dashUntilMs = now + this.cfg.dashMs;
    g.dashReadyMs = now + this.cfg.dashCooldownMs;
    this.s.events.push({ type: 'dash', ghost: g.id });
  }

  // One sub-step: a ghost on the arena runs; a falling ghost drifts without control; an out
  // ghost waits.
  private move(g: Ghost, intent: Intent, dtMs: number): void {
    if (g.phase === 'out') return;
    Object.assign(g, moveOnce(this.cfg, g, g.phase === 'in' ? intent : IDLE, dtMs));
  }
}

function newGhost(r: Roster, p: { x: number; y: number }, lives: number): Ghost {
  return {
    id: r.id,
    team: r.team,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    phase: 'in',
    phaseUntilMs: 0,
    protectedUntilMs: 0,
    dashUntilMs: 0,
    knockedUntilMs: 0,
    dashReadyMs: 0,
    lastTouch: null,
    knockouts: 0,
    falls: 0,
    lives,
    outAtMs: null,
    aliveSinceMs: 0,
    longestAliveMs: 0,
    scoreMs: 0,
    bounces: 0,
    passes: 0,
  };
}
