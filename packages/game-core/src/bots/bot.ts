// Seasonal Sumo — the sumo bot's brain, and the helpers the other modes' brains (hill.ts,
// bomb.ts) share: rough but lively (NIGHT 2026-11-17). It reads the public match state only,
// the same a player's client sees; the human-like layer (human.ts) hands it what a player
// would see and blurs what it decides. Near the edge — a share of the arena's radius — it turns
// back inward; otherwise it
// heads for where the nearest opponent it can push will be (in Last One Standing, once only its
// own team is left, its teammates too — standing.ts rivals) and dashes when lined up close
// enough and the dash would not carry it past the edge; with no
// such opponent it walks to its own wander point. The wander point (by id, moved on every
// bots.wanderMs) also offsets the approach, so bots do not all meet in one spot.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { canJump } from '../jump.js';
import { rivals } from '../standing.js';
import { IDLE, type Ghost, type Intent, type MatchState, type Vec } from '../types.js';
import { windingUp } from '../windup.js';

export type Bot = (s: Readonly<MatchState>, me: Readonly<Ghost>) => Intent;

const GOLDEN = 0.6180339887498949; // spreads the wander points of consecutive ids evenly

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
    if (g.id === me.id || !rivals(s, me, g) || g.phase !== 'in' || !accept(g)) continue;
    if (!best || distance(me, g) < distance(me, best)) best = g;
  }
  return best;
}

// Where `g` will be bots.leadMs on at its seen speed: a bot aims there, not where it was seen
// (FIX 2026-11-17-5: chasing the seen position, the last two bots ran in circles).
function leadPoint(cfg: GameConfig, g: Readonly<Ghost>): Vec {
  const t = cfg.bots.leadMs / 1000;
  return { x: g.x + g.vx * t, y: g.y + g.vy * t };
}

// A dash at where `target` will be when it is within dashRange, the cooldown is over and the bot
// is lined up; else running there.
export function strike(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
  target: Readonly<Ghost>,
): Intent {
  const aim = toward(me, leadPoint(cfg, target));
  const ready = s.elapsedMs >= me.dashReadyMs && distance(me, target) <= cfg.bots.dashRange;
  return ready && linedUp(cfg, me, aim) ? { ...aim, action: 'dash' } : aim;
}

// Lined up: moving (or, standing, facing by default) towards the target well enough.
function linedUp(cfg: GameConfig, me: Readonly<Ghost>, aim: Intent): boolean {
  const speed = Math.hypot(me.vx, me.vy);
  if (speed < 1) return true;
  return (me.vx * aim.dx + me.vy * aim.dy) / speed >= cfg.bots.dashAimCos;
}

// How far inside the edge a bot turns back: its own margin (bots.edgeMargin with its slack), but
// at most a share of the edge's radius, never less than a ghost radius — so the full arena keeps
// the margin and only a small one shrinks it (FIX 2026-11-17-4; FIX 2026-11-17, BACKLOG ac: the
// absolute 140 left a halved arena of 141 only its middle, and "stop, no time limit" did not end).
export function edgeMargin(cfg: GameConfig, edge: number): number {
  const b = cfg.bots;
  return Math.max(cfg.ghostRadius, Math.min(b.edgeMargin, edge * b.edgeShare));
}

// A rival dashing at it within dashRange — or winding up a dash at it, its glow and line on
// screen (windup.ts) — heading at it at least as well as a bot lines up a dash (dashAimCos),
// while its own jump is ready: the moment to jump (JUMP 2026-11-17). `s` is what the bot
// perceives, a reaction time late (bots/human.ts decides whether it does).
export function underAttack(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
): boolean {
  const now = s.elapsedMs;
  if (!canJump(cfg, me, now)) return false;
  return s.ghosts.some((g) => {
    if (g.id === me.id || g.phase !== 'in' || !rivals(s, me, g)) return false;
    const heading = attackHeading(g, now);
    if (!heading) return false;
    const d = distance(me, g);
    const speed = Math.hypot(heading.x, heading.y);
    if (d > cfg.bots.dashRange || d === 0 || speed === 0) return false;
    return (
      (heading.x * (me.x - g.x) + heading.y * (me.y - g.y)) / (speed * d) >= cfg.bots.dashAimCos
    );
  });
}

// Where a rival's attack points: its dash's motion, or a wind-up's stored dash; null: none.
function attackHeading(g: Readonly<Ghost>, now: number): { x: number; y: number } | null {
  if (now < g.dashUntilMs) return { x: g.vx, y: g.vy };
  return windingUp(g, now) ? { x: g.windVx, y: g.windVy } : null;
}

export function botIntent(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  if (me.phase !== 'in' || s.ended) return IDLE;
  // The edge that counts is the smaller of now and where it is going.
  const edge = Math.min(s.arena.radius, s.arena.target);
  const fromCentre = distance(me, s.arena.centre);
  if (fromCentre > edge - edgeMargin(cfg, edge)) return toward(me, s.arena.centre);
  // The nearest opponent a push would move (not protected after a respawn).
  const target = nearest(s, me, (g) => s.elapsedMs >= g.protectedUntilMs);
  const wander = wanderPoint(cfg, s, me.id);
  if (!target) return toward(me, wander);
  const d = distance(me, target);
  if (d > cfg.bots.dashRange) {
    // Approach from the bot's own side: a little towards its wander point.
    const side = toward(target, wander);
    const off = cfg.bots.dashRange * cfg.bots.approach;
    return toward(me, { x: target.x + side.dx * off, y: target.y + side.dy * off });
  }
  // Never a dash that would carry it past the edge on its own: half a dash range, but in a small
  // arena at most bots.edgeShare of its radius, as the edge margin (FIX 2026-11-17-5: the full
  // half range left the last halving's arena of 141 a dash only within 31 of the middle — the
  // last bots never dashed).
  const carry = Math.min(cfg.bots.dashRange / 2, edge * cfg.bots.edgeShare);
  const room = fromCentre + carry < edge;
  return room ? strike(cfg, s, me, target) : toward(me, leadPoint(cfg, target));
}
