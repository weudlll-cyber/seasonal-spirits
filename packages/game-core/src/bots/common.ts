// Seasonal Spirits — what the three bot strategies share: steering and simple searches.
// Bots read the public match state only, the same a player's client sees.

import type { GameConfig } from '../config.js';
import { distance, shrineOf } from '../geometry.js';
import type { Ghost, Intent, MatchState, Vec } from '../types.js';

export type Bot = (s: Readonly<MatchState>, me: Readonly<Ghost>) => Intent;

export const IDLE: Intent = { dx: 0, dy: 0 };

export function steerTo(cfg: GameConfig, from: Vec, to: Vec): Intent {
  const d = distance(from, to);
  if (d <= cfg.bots.arriveRadius) return IDLE;
  return { dx: (to.x - from.x) / d, dy: (to.y - from.y) / d };
}

// Walk home; once inside the own shrine, do the shrine action.
export function goHomeAnd(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
  action: 'secure' | 'swap',
): Intent {
  const home = shrineOf(s.shrines, me.team);
  if (distance(me, home) <= cfg.shrineRadius) return { dx: 0, dy: 0, action };
  return steerTo(cfg, me, home);
}

// For every field coin, the ghost closest to it — worked out once per tick and match, so 32
// bots asking in one tick cost one pass (public state only, like everything a bot reads).
const closest = new WeakMap<Readonly<MatchState>, { tick: number; byCoin: Map<number, number> }>();

function closestGhostByCoin(s: Readonly<MatchState>): Map<number, number> {
  const cached = closest.get(s);
  if (cached?.tick === s.tick) return cached.byCoin;
  const byCoin = new Map<number, number>();
  for (const c of s.coins) {
    let best = Infinity;
    for (const g of s.ghosts) {
      const d = distance(g, c);
      if (d < best) {
        best = d;
        byCoin.set(c.id, g.id);
      }
    }
  }
  closest.set(s, { tick: s.tick, byCoin });
  return byCoin;
}

const GOLDEN = 0.6180339887498949; // spreads the waypoints of consecutive ids evenly

// A collector's waypoint inside the square the four shrines span, where it looks for coins
// when no coin is its own: spread over the field by its id (golden-ratio sequence) and moved
// on every bots.waypointMs, so a waiting collector patrols instead of standing still; a
// collector already at it walks on to the next one (`leg` + 1).
export function waypointOf(cfg: GameConfig, id: number, leg: number): Vec {
  const n = id + 101 * leg;
  const lo = cfg.shrineInset;
  const span = cfg.fieldSize - 2 * cfg.shrineInset;
  return { x: lo + span * frac(n * GOLDEN), y: lo + span * frac(n * GOLDEN * GOLDEN + 0.5) };
}

// Head for the nearest field coin that no other ghost is closer to; without such a coin,
// walk to the own waypoint. Before 2026-11-15 every collector took its nearest coin, so
// neighbours shared one target, travelled as one pack of up to ten mixed ghosts and switched
// together to the next coin (session sheet 2026-11-15-CD).
export function collect(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  const owner = closestGhostByCoin(s);
  let mine: Vec | null = null;
  let best = Infinity;
  for (const c of s.coins) {
    const d = distance(me, c);
    if (owner.get(c.id) === me.id && d < best) {
      best = d;
      mine = c;
    }
  }
  if (mine) return steerTo(cfg, me, mine);
  const leg = Math.floor(s.elapsedMs / cfg.bots.waypointMs);
  const here = waypointOf(cfg, me.id, leg);
  const arrived = distance(me, here) <= cfg.bots.arriveRadius;
  return steerTo(cfg, me, arrived ? waypointOf(cfg, me.id, leg + 1) : here);
}

// Every season ends with a deadline — a halving, or the match end in the last season. True
// once the time left is just enough to walk home at carrying speed, secure, and keep
// bots.deadlineMarginMs spare — plus, trial T4 (`bots.deadlineSpreadMs`, 0 = off), a share
// of that spread fixed by the ghost's id, so a team does not set off home in the same tick
// (session 2026-11-16-HUMAN: 63 % of the groups at the shrines form 5–10 s before a deadline).
export function deadlineNear(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
): boolean {
  const toShrine = Math.max(0, distance(me, shrineOf(s.shrines, me.team)) - cfg.shrineRadius);
  const walkMs = (toShrine / (cfg.ghostSpeed * cfg.carrySpeedFactor)) * 1000;
  const spare = cfg.bots.deadlineMarginMs + cfg.bots.deadlineSpreadMs * frac(me.id * GOLDEN);
  return s.clock.timeLeftMs <= walkMs + cfg.secureDurationMs + spare;
}

const frac = (v: number): number => v - Math.floor(v);
