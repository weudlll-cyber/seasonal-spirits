// Seasonal Sumo — one match: the pure, deterministic core driven by tick(dt).
// No clock and no randomness of its own: time is the sum of the dt values it is given and
// every random value comes from the seed, so the same seed and intents give the same match.

import { newArena, startSpot, updateArena } from './arena.js';
import { collideGhosts } from './collisions.js';
import type { GameConfig } from './config.js';
import { advancePhases, checkFalls } from './falls.js';
import { dashVelocity, stepGhost } from './geometry.js';
import { applyHalving } from './halving.js';
import { mulberry32 } from './rng.js';
import { seasonClock } from './seasons.js';
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

  constructor(cfg: GameConfig, seed: number, roster: readonly Roster[]) {
    this.cfg = cfg;
    // The match's one seeded random source: the respawn spots (arena.ts respawnSpot).
    this.rng = mulberry32(seed);
    const arena = newArena(cfg);
    const sorted = [...roster].sort((a, b) => a.id - b.id);
    const ghosts = sorted.map((r) => {
      const mates = sorted.filter((m) => m.team === r.team);
      const p = startSpot(cfg, arena, r.team, { index: mates.indexOf(r), of: mates.length });
      return newGhost(r, p.x, p.y);
    });
    this.s = {
      elapsedMs: 0,
      tick: 0,
      clock: seasonClock(cfg, 0),
      countdownMs: null,
      ended: false,
      arena,
      ghosts,
      events: [],
    };
  }

  get state(): Readonly<MatchState> {
    return this.s;
  }

  // One step. Order: time and season (a season turn is a halving), the arena's edge, falls
  // ending and respawns, each ghost's intent and movement (by id), collisions, new falls, the
  // end, the countdown. Intents of unknown ids are ignored.
  tick(dtMs: number, intents: ReadonlyMap<number, Intent>): Readonly<MatchState> {
    const s = this.s;
    s.events = [];
    if (s.ended || !(dtMs > 0)) return s;
    const prevSeason = s.clock.index;
    s.elapsedMs = Math.min(this.cfg.matchDurationMs, s.elapsedMs + dtMs);
    s.tick++;
    s.clock = seasonClock(this.cfg, s.elapsedMs);
    if (s.clock.index !== prevSeason) applyHalving(s);
    updateArena(this.cfg, s.arena, s.elapsedMs);
    advancePhases(this.cfg, s, this.rng);
    for (const g of s.ghosts) this.move(g, intents.get(g.id) ?? IDLE, dtMs);
    collideGhosts(this.cfg, s);
    checkFalls(this.cfg, s);
    s.ended = s.elapsedMs >= this.cfg.matchDurationMs;
    if (s.ended) s.events.push({ type: 'match-end', atMs: s.elapsedMs });
    // One countdown for every deadline: before each halving, and in the last season before
    // the match end (the server tells the clients which one).
    const left = s.clock.timeLeftMs;
    s.countdownMs = !s.ended && left <= this.cfg.deadlineCountdownMs ? left : null;
    return s;
  }

  // A player takes over a ghost a bot steered: it starts from standing, not with the bot's
  // momentum (the server calls this on a join).
  halt(id: number): void {
    const g = this.s.ghosts.find((x) => x.id === id);
    if (g) Object.assign(g, { vx: 0, vy: 0, dashUntilMs: 0 });
  }

  // Knockouts per player and team; a ghost's longest stretch without a fall counts the one
  // it is in at the end too.
  result(): MatchResult {
    const teams = TEAMS.map(() => 0);
    const now = this.s.elapsedMs;
    const players = this.s.ghosts.map((g) => {
      teams[g.team] = (teams[g.team] ?? 0) + g.knockouts;
      const running = g.phase === 'in' ? now - g.aliveSinceMs : 0;
      return {
        id: g.id,
        team: g.team,
        knockouts: g.knockouts,
        falls: g.falls,
        longestAliveMs: Math.max(g.longestAliveMs, running),
      };
    });
    return { players, teams };
  }

  // A ghost on the arena runs and may dash (the cooldown is the core's: a dash before
  // dashReadyMs does nothing); a falling ghost drifts without control; an out ghost waits.
  private move(g: Ghost, intent: Intent, dtMs: number): void {
    if (g.phase === 'out') return;
    const now = this.s.elapsedMs;
    const steer = g.phase === 'in' ? intent : IDLE;
    if (g.phase === 'in' && intent.action === 'dash' && now >= g.dashReadyMs) {
      const v = dashVelocity(this.cfg, g, intent);
      if (v) {
        g.vx = v.x;
        g.vy = v.y;
        g.dashUntilMs = now + this.cfg.dashMs;
        g.dashReadyMs = now + this.cfg.dashCooldownMs;
        this.s.events.push({ type: 'dash', ghost: g.id });
      }
    }
    Object.assign(g, stepGhost(this.cfg, g, steer, dtMs));
  }
}

function newGhost(r: Roster, x: number, y: number): Ghost {
  return {
    id: r.id,
    team: r.team,
    x,
    y,
    vx: 0,
    vy: 0,
    phase: 'in',
    phaseUntilMs: 0,
    protectedUntilMs: 0,
    dashUntilMs: 0,
    dashReadyMs: 0,
    lastTouch: null,
    knockouts: 0,
    falls: 0,
    aliveSinceMs: 0,
    longestAliveMs: 0,
  };
}
