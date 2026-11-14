// Seasonal Spirits — the three bot strategies of CONCEPT.md §2a as small state machines.
// Each picks a mode from the public state, then acts on it: patient swaps before every
// halving and banks before the end, cautious banks early and before every halving, hunter
// takes from carriers.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { isLastSeason, totalCount } from '../seasons.js';
import type { Ghost, Intent, MatchState } from '../types.js';
import { collect, deadlineNear, goHomeAnd, steerTo, IDLE, type Bot } from './common.js';

export type Strategy = 'patient' | 'cautious' | 'hunter';
export const STRATEGIES: readonly Strategy[] = ['patient', 'cautious', 'hunter'];

type Mode = 'collect' | 'swap' | 'secure';

function patientMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  if (!deadlineNear(cfg, s, me)) return 'collect';
  if (isLastSeason(cfg, s.clock)) return totalCount(me.carried) > 0 ? 'secure' : 'collect';
  return me.carried[s.clock.current] >= cfg.swapIn ? 'swap' : 'collect';
}

function cautiousMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  const carried = totalCount(me.carried);
  if (carried >= cfg.bots.cautiousSecureAt) return 'secure';
  return carried > 0 && deadlineNear(cfg, s, me) ? 'secure' : 'collect';
}

function nearestCarrier(s: Readonly<MatchState>, me: Readonly<Ghost>): Ghost | null {
  let best: Ghost | null = null;
  for (const g of s.ghosts) {
    if (g.team === me.team || totalCount(g.carried) === 0) continue;
    if (!best || distance(me, g) < distance(me, best)) best = g;
  }
  return best;
}

function hunt(cfg: GameConfig, me: Readonly<Ghost>, prey: Readonly<Ghost>): Intent {
  const dir = steerTo(cfg, me, prey);
  return distance(me, prey) <= cfg.stealRange ? { ...dir, action: 'steal' } : dir;
}

function act(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>, mode: Mode): Intent {
  return mode === 'collect' ? collect(cfg, s, me) : goHomeAnd(cfg, s, me, mode);
}

export function createBot(cfg: GameConfig, strategy: Strategy): Bot {
  return (s, me) => {
    if (me.securingUntilMs !== null || s.ended) return IDLE;
    switch (strategy) {
      case 'patient':
        return act(cfg, s, me, patientMode(cfg, s, me));
      case 'cautious':
        return act(cfg, s, me, cautiousMode(cfg, s, me));
      case 'hunter': {
        const carried = totalCount(me.carried);
        if (carried >= cfg.bots.hunterSecureAt || (carried > 0 && isLastSeason(cfg, s.clock))) {
          return goHomeAnd(cfg, s, me, 'secure');
        }
        const prey = nearestCarrier(s, me);
        return prey ? hunt(cfg, me, prey) : collect(cfg, s, me);
      }
    }
  };
}
