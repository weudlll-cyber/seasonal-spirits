// Seasonal Spirits — one match: the pure, deterministic core driven by tick(dt).
// No clock and no randomness of its own: time is the sum of the dt values it is given and
// every random value comes from the seed, so the same seed and intents give the same match.

import { completeSecure, trySecureStart, trySteal, trySwap } from './actions.js';
import type { GameConfig } from './config.js';
import { pickUpCoins, spawnCoins, takeFromPool, type Spawner } from './field.js';
import { clamp, clampDirection, shrineOf, shrinePositions } from './geometry.js';
import { applyHalving } from './halving.js';
import { mulberry32 } from './rng.js';
import { emptyCounts, seasonClock, totalCount } from './seasons.js';
import {
  TEAMS,
  type Ghost,
  type Intent,
  type MatchResult,
  type MatchState,
  type Team,
  type Vec,
} from './types.js';

export interface Roster {
  id: number;
  team: Team;
}

export class Match {
  readonly cfg: GameConfig;
  private readonly s: MatchState;
  private readonly spawner: Spawner;

  constructor(cfg: GameConfig, seed: number, roster: readonly Roster[]) {
    this.cfg = cfg;
    const rng = mulberry32(seed);
    const shrines = shrinePositions(cfg);
    this.spawner = { rng, acc: 0, nextId: 1 };
    this.s = {
      elapsedMs: 0,
      tick: 0,
      clock: seasonClock(cfg, 0),
      halvingCountdownMs: null,
      halvingDone: false,
      ended: false,
      ghosts: [...roster]
        .sort((a, b) => a.id - b.id)
        .map((r) => newGhost(r, shrineOf(shrines, r.team), cfg.startSpread, rng)),
      coins: [],
      pool: emptyCounts(),
      poolCenter: { x: cfg.fieldSize / 2, y: cfg.fieldSize / 2 },
      shrines,
      events: [],
      stats: { spawned: 0, pooled: 0, poolTaken: 0 },
    };
  }

  get state(): Readonly<MatchState> {
    return this.s;
  }

  // One step. Order: time and season, halving, each ghost's intent (by id), pick-ups,
  // spawning, countdown. Intents of unknown ids are ignored.
  tick(dtMs: number, intents: ReadonlyMap<number, Intent>): Readonly<MatchState> {
    const s = this.s;
    s.events = [];
    if (s.ended || !(dtMs > 0)) return s;
    const prevSeason = s.clock.index;
    s.elapsedMs = Math.min(this.cfg.matchDurationMs, s.elapsedMs + dtMs);
    s.tick++;
    s.clock = seasonClock(this.cfg, s.elapsedMs);
    if (s.clock.index !== prevSeason) {
      s.coins = []; // only coins of the current season lie on the field
      s.events.push({ type: 'season', season: s.clock.current, atMs: s.elapsedMs });
    }
    if (!s.halvingDone && s.elapsedMs >= this.cfg.halvingAtMs) applyHalving(s);
    for (const g of s.ghosts) this.applyIntent(g, intents.get(g.id), dtMs);
    pickUpCoins(this.cfg, s);
    takeFromPool(this.cfg, s);
    spawnCoins(this.cfg, s, this.spawner, dtMs);
    const toHalving = this.cfg.halvingAtMs - s.elapsedMs;
    s.halvingCountdownMs =
      !s.halvingDone && toHalving <= this.cfg.halvingCountdownMs ? toHalving : null;
    // At the end, unsecured coins and unfinished secures count for nothing.
    s.ended = s.elapsedMs >= this.cfg.matchDurationMs;
    return s;
  }

  result(): MatchResult {
    const teams = TEAMS.map(() => 0);
    const players = this.s.ghosts.map((g) => {
      teams[g.team] = (teams[g.team] ?? 0) + g.securedValue;
      return { id: g.id, team: g.team, secured: g.securedValue };
    });
    return { players, teams };
  }

  private applyIntent(g: Ghost, intent: Intent | undefined, dtMs: number): void {
    if (g.securingUntilMs !== null) {
      completeSecure(this.cfg, this.s, g); // a securing ghost stands still and does nothing else
      return;
    }
    if (!intent) return;
    const dir = clampDirection(intent.dx, intent.dy);
    const carrying = totalCount(g.carried) > 0;
    const step = (this.cfg.ghostSpeed * (carrying ? this.cfg.carrySpeedFactor : 1) * dtMs) / 1000;
    g.x = clamp(g.x + dir.x * step, 0, this.cfg.fieldSize);
    g.y = clamp(g.y + dir.y * step, 0, this.cfg.fieldSize);
    if (intent.action === 'steal') trySteal(this.cfg, this.s, g);
    else if (intent.action === 'swap') trySwap(this.cfg, this.s, g);
    else if (intent.action === 'secure') trySecureStart(this.cfg, this.s, g);
  }
}

// Ghosts start around their own shrine, spread a little so they do not stack.
function newGhost(r: Roster, home: Vec, spread: number, rng: () => number): Ghost {
  return {
    id: r.id,
    team: r.team,
    x: home.x + (rng() - 0.5) * spread,
    y: home.y + (rng() - 0.5) * spread,
    carried: emptyCounts(),
    securedValue: 0,
    securingUntilMs: null,
    securingSeason: null,
    lastStealMs: -Infinity,
    lastPoolTakeMs: -Infinity,
  };
}
