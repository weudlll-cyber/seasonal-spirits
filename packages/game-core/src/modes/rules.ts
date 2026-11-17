// Seasonal Sumo — what a game mode adds to the shared match: its start, its halving and its
// scoring. The physics, the falls' phases, the season clock, the countdown and the end are the
// match's (match.ts), one implementation for every mode; a mode only adds its own rules.

import { nextRadius } from '../arena.js';
import type { GameConfig, GameMode } from '../config.js';
import type { Disc, Ghost, MatchState } from '../types.js';
import { bombRules } from './bomb.js';
import { hillRules, nextZone } from './hill.js';
import { sumoRules } from './sumo.js';

export interface ModeRules {
  // Once, after the ghosts are placed: the zone, the first bombs.
  start(s: MatchState, rng: () => number): void;
  // At every halving, after the season turned: the arena halves, the zone jumps, bombs go off.
  turn(s: MatchState, rng: () => number): void;
  // Every tick after the collisions: falls, points in the zone, bomb passes.
  after(s: MatchState, dtMs: number): void;
}

export function rulesFor(cfg: GameConfig): ModeRules {
  if (cfg.mode === 'hill') return hillRules(cfg);
  if (cfg.mode === 'bomb') return bombRules(cfg);
  return sumoRules(cfg);
}

// A ghost's score in its mode: sumo knockouts, hill seconds in the zone, bomb points (whole).
export function scoreOf(mode: GameMode, g: Readonly<Ghost>): number {
  return mode === 'sumo' ? g.knockouts : Math.floor(g.scoreMs / 1000);
}

// The disc the clients draw glowing now and dashed for the next halving: sumo's arena and its
// next edge, the hill's zone and where it jumps; none in bomb.
export function areaOf(
  cfg: GameConfig,
  s: Readonly<MatchState>,
): { now: Disc | null; next: Disc | null } {
  if (cfg.mode === 'hill') return { now: s.zone, next: nextZone(cfg, s) };
  if (cfg.mode === 'bomb') return { now: null, next: null };
  const { x, y } = s.arena.centre;
  return { now: { x, y, r: s.arena.radius }, next: { x, y, r: nextRadius(s.arena) } };
}
