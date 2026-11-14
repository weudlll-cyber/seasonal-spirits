// Seasonal Spirits — the three bot strategies of CONCEPT.md §2a as small state machines.
// Each picks a mode from the public state, then acts on it: patient swaps every season and
// banks in the last one, cautious banks early and often, hunter takes from carriers.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { totalCount } from '../seasons.js';
import type { Ghost, Intent, MatchState } from '../types.js';
import { collect, goHomeAnd, isLastSeason, steerTo, IDLE, type Bot } from './common.js';

export type Strategy = 'patient' | 'cautious' | 'hunter';
export const STRATEGIES: readonly Strategy[] = ['patient', 'cautious', 'hunter'];

type PatientMode = 'collect' | 'swap' | 'secure';

function patientMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): PatientMode {
  if (isLastSeason(cfg, s)) return totalCount(me.carried) > 0 ? 'secure' : 'collect';
  return me.carried[s.clock.current] >= cfg.swapIn ? 'swap' : 'collect';
}

function cautiousMode(cfg: GameConfig, me: Readonly<Ghost>): 'collect' | 'secure' {
  return totalCount(me.carried) >= cfg.bots.cautiousSecureAt ? 'secure' : 'collect';
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

export function createBot(cfg: GameConfig, strategy: Strategy): Bot {
  return (s, me) => {
    if (me.securingUntilMs !== null || s.ended) return IDLE;
    switch (strategy) {
      case 'patient': {
        const mode = patientMode(cfg, s, me);
        return mode === 'collect' ? collect(cfg, s, me) : goHomeAnd(cfg, s, me, mode);
      }
      case 'cautious':
        return cautiousMode(cfg, me) === 'secure'
          ? goHomeAnd(cfg, s, me, 'secure')
          : collect(cfg, s, me);
      case 'hunter': {
        const carried = totalCount(me.carried);
        if (carried >= cfg.bots.hunterSecureAt || (carried > 0 && isLastSeason(cfg, s))) {
          return goHomeAnd(cfg, s, me, 'secure');
        }
        const prey = nearestCarrier(s, me);
        return prey ? hunt(cfg, me, prey) : collect(cfg, s, me);
      }
    }
  };
}
