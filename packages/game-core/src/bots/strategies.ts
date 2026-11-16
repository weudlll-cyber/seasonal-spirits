// Seasonal Spirits — the two bot styles of V5 (owner decision 2026-11-16) as small state
// machines. Each picks a mode from the public state, then acts on it with the shared helpers
// (collect, goHomeAndSecure):
// - banker: collects the most valuable coins nearby at today's prices, secures early (from
//   bots.bankerSecureValue on) and before every deadline;
// - planner: collects the next season's coins while they are cheap, carries them across the
//   halving and secures right after it, when they are worth most; secures before the match
//   end. (The patient, cautious and hunter bots went with the swap and stealing.)

import type { GameConfig } from '../config.js';
import { priceOf, valueNow } from '../prices.js';
import { isLastSeason, totalCount } from '../seasons.js';
import type { FieldCoin, Ghost, MatchState } from '../types.js';
import { collect, deadlineNear, goHomeAndSecure, IDLE, type Bot } from './common.js';

export type Strategy = 'banker' | 'planner';
export const STRATEGIES: readonly Strategy[] = ['banker', 'planner'];

type Mode = 'collect' | 'secure';
type Worth = (c: FieldCoin) => number;

function banker(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  const carried = totalCount(me.carried);
  if (carried === 0) return 'collect';
  const value = valueNow(cfg, me.carried, s.clock.current);
  return value >= cfg.bots.bankerSecureValue || deadlineNear(cfg, s, me) ? 'secure' : 'collect';
}

// Never secures before a halving except the last deadline: what it carries is meant to rise.
function planner(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  if (totalCount(me.crossed) > 0) return 'secure'; // carried across a halving: worth most now
  const last = isLastSeason(cfg, s.clock);
  return last && totalCount(me.carried) > 0 && deadlineNear(cfg, s, me) ? 'secure' : 'collect';
}

// What a coin is worth to the style: the banker today's price; the planner the price after
// the next halving, or today's in the last season, which ends with the match.
function worthFor(cfg: GameConfig, strategy: Strategy, s: Readonly<MatchState>): Worth {
  const { current, next } = s.clock;
  const later = strategy === 'planner' && !isLastSeason(cfg, s.clock) ? next : current;
  return (c) => priceOf(cfg, c.season, later);
}

export function createBot(cfg: GameConfig, strategy: Strategy): Bot {
  const modeOf = strategy === 'banker' ? banker : planner;
  return (s, me) => {
    if (me.securingUntilMs !== null || s.ended) return IDLE;
    if (modeOf(cfg, s, me) === 'secure') return goHomeAndSecure(cfg, s, me);
    return collect(cfg, s, me, worthFor(cfg, strategy, s));
  };
}
