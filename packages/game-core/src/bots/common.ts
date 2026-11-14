// Seasonal Spirits — what the three bot strategies share: steering and simple searches.
// Bots read the public match state only, the same a player's client sees.

import type { GameConfig } from '../config.js';
import { distance, shrineOf } from '../geometry.js';
import { totalCount } from '../seasons.js';
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

// Head for the nearest field coin, or for the halving pool if it is fuller; idle if none.
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
  if (totalCount(s.pool) > 0 && distance(me, s.poolCenter) < best) target = s.poolCenter;
  return target ? steerTo(cfg, me, target) : IDLE;
}

export function isLastSeason(cfg: GameConfig, s: Readonly<MatchState>): boolean {
  return s.clock.index >= Math.ceil(cfg.matchDurationMs / cfg.seasonDurationMs) - 1;
}
