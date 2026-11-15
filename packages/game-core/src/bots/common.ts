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

// Head for the nearest field coin; idle if there is none.
export function collect(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  let target: Vec | null = null;
  let best = Infinity;
  for (const c of s.coins) {
    const d = distance(me, c);
    if (d < best) {
      best = d;
      target = c;
    }
  }
  return target ? steerTo(cfg, me, target) : IDLE;
}

// Every season ends with a deadline — a halving, or the match end in the last season. True
// once the time left is just enough to walk home at carrying speed, secure, and keep
// bots.deadlineMarginMs spare.
export function deadlineNear(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
): boolean {
  const toShrine = Math.max(0, distance(me, shrineOf(s.shrines, me.team)) - cfg.shrineRadius);
  const walkMs = (toShrine / (cfg.ghostSpeed * cfg.carrySpeedFactor)) * 1000;
  return s.clock.timeLeftMs <= walkMs + cfg.secureDurationMs + cfg.bots.deadlineMarginMs;
}
