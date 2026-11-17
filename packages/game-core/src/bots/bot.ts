// Seasonal Sumo — the sumo bot's brain, and the helpers the other modes' brains (hill.ts,
// bomb.ts) share: rough but lively (NIGHT 2026-11-17). It reads the public match state only,
// the same a player's client sees; the human-like layer (human.ts) hands it what a player
// would see and blurs what it decides. Near the edge it turns back inward; otherwise it
// heads for the nearest opponent it can push and dashes when lined up close enough; with no
// such opponent it walks to its own wander point. The wander point (by id, moved on every
// bots.wanderMs) also offsets the approach, so bots do not all meet in one spot.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { IDLE, type Ghost, type Intent, type MatchState, type Vec } from '../types.js';

export type Bot = (s: Readonly<MatchState>, me: Readonly<Ghost>) => Intent;

const GOLDEN = 0.6180339887498949; // spreads the wander points of consecutive ids evenly
const APPROACH_OFFSET = 0.25; // share of the dash range a bot aims beside its target

export function toward(from: Vec, to: Vec): Intent {
  const d = distance(from, to);
  return d > 0 ? { dx: (to.x - from.x) / d, dy: (to.y - from.y) / d } : IDLE;
}

// The bot's own point on the arena: an angle by id, moved on every wanderMs, at 40 % of the
// radius.
export function wanderPoint(cfg: GameConfig, s: Readonly<MatchState>, id: number): Vec {
  const leg = Math.floor(s.elapsedMs / cfg.bots.wanderMs);
  const turn = (id * GOLDEN + leg * GOLDEN * GOLDEN) % 1;
  const a = turn * 2 * Math.PI;
  const r = s.arena.radius * 0.4;
  return { x: s.arena.centre.x + Math.cos(a) * r, y: s.arena.centre.y + Math.sin(a) * r };
}

// The nearest opponent on the arena that `accept` takes.
export function nearest(
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
  accept: (g: Ghost) => boolean,
): Ghost | null {
  let best: Ghost | null = null;
  for (const g of s.ghosts) {
    if (g.team === me.team || g.phase !== 'in' || !accept(g)) continue;
    if (!best || distance(me, g) < distance(me, best)) best = g;
  }
  return best;
}

// A dash at `target` when it is within dashRange, the cooldown is over and the bot is lined up;
// else running at it.
export function strike(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
  target: Readonly<Ghost>,
): Intent {
  const aim = toward(me, target);
  const ready = s.elapsedMs >= me.dashReadyMs && distance(me, target) <= cfg.bots.dashRange;
  return ready && linedUp(cfg, me, aim) ? { ...aim, action: 'dash' } : aim;
}

// Lined up: moving (or, standing, facing by default) towards the target well enough.
function linedUp(cfg: GameConfig, me: Readonly<Ghost>, aim: Intent): boolean {
  const speed = Math.hypot(me.vx, me.vy);
  if (speed < 1) return true;
  return (me.vx * aim.dx + me.vy * aim.dy) / speed >= cfg.bots.dashAimCos;
}

export function botIntent(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  if (me.phase !== 'in' || s.ended) return IDLE;
  // The edge that counts is the smaller of now and where it is going.
  const edge = Math.min(s.arena.radius, s.arena.target);
  const fromCentre = distance(me, s.arena.centre);
  if (fromCentre > edge - cfg.bots.edgeMargin) return toward(me, s.arena.centre);
  // The nearest opponent a push would move (not protected after a respawn).
  const target = nearest(s, me, (g) => s.elapsedMs >= g.protectedUntilMs);
  const wander = wanderPoint(cfg, s, me.id);
  if (!target) return toward(me, wander);
  const d = distance(me, target);
  if (d > cfg.bots.dashRange) {
    // Approach from the bot's own side: a little towards its wander point.
    const side = toward(target, wander);
    const off = cfg.bots.dashRange * APPROACH_OFFSET;
    return toward(me, { x: target.x + side.dx * off, y: target.y + side.dy * off });
  }
  // Never a dash that would carry it past the edge on its own.
  const room = fromCentre + cfg.bots.dashRange / 2 < edge;
  return room ? strike(cfg, s, me, target) : toward(me, target);
}
