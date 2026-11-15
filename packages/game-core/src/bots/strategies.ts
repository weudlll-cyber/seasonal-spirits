// Seasonal Spirits — the three bot strategies of CONCEPT.md §2a as small state machines.
// Each picks a mode from the public state, then acts on it: patient swaps before every
// halving and banks before the end, cautious banks early and before every halving, hunter
// takes from carriers richer than itself.

import type { GameConfig } from '../config.js';
import { nearestOpponentCarrier } from '../actions.js';
import { distance } from '../geometry.js';
import { isLastSeason, nextSeason, totalCount } from '../seasons.js';
import type { Ghost, Intent, MatchState } from '../types.js';
import { collect, deadlineNear, goHomeAnd, IDLE, type Bot } from './common.js';

export type Strategy = 'patient' | 'cautious' | 'hunter';
export const STRATEGIES: readonly Strategy[] = ['patient', 'cautious', 'hunter'];

type Mode = 'collect' | 'swap' | 'secure';

// An opponent within bots.threatRange: anyone there can steal from a carrier.
function threatened(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): boolean {
  return s.ghosts.some((g) => g.team !== me.team && distance(me, g) <= cfg.bots.threatRange);
}

// Holds coins for the swap chain (10 → 15 of the next season). Two faults fixed on
// 2026-11-15 (session sheet 2026-11-15-CD): it carried a full load past opponents without
// reacting — now, with at least swapIn coins and an opponent close, it goes home to swap or
// bank; and with fewer than swapIn coins of the season it let the halving halve them — now it
// banks them, unless the next season's coins it carries (from a swap) are worth more to it.
function patientMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  const current = me.carried[s.clock.current];
  const canSwap = current >= cfg.swapIn && !isLastSeason(cfg, s.clock);
  if (totalCount(me.carried) >= cfg.swapIn && threatened(cfg, s, me)) {
    return canSwap ? 'swap' : 'secure';
  }
  if (!deadlineNear(cfg, s, me)) return 'collect';
  if (isLastSeason(cfg, s.clock)) return totalCount(me.carried) > 0 ? 'secure' : 'collect';
  if (canSwap) return 'swap';
  return current > me.carried[nextSeason(s.clock.current)] ? 'secure' : 'collect';
}

function cautiousMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  const carried = totalCount(me.carried);
  if (carried >= cfg.bots.cautiousSecureAt) return 'secure';
  return carried > 0 && deadlineNear(cfg, s, me) ? 'secure' : 'collect';
}

// Only a carrier richer than the hunter is prey. Without that rule hunters robbed each other:
// a steal rounds up, so a single coin always changes hands, the loot circulated inside a
// pack of hunters, none reached hunterSecureAt, and the pack stood still (2026-11-15).
function nearestCarrier(s: Readonly<MatchState>, me: Readonly<Ghost>): Ghost | null {
  const own = totalCount(me.carried);
  let best: Ghost | null = null;
  for (const g of s.ghosts) {
    if (g.team === me.team || totalCount(g.carried) <= own) continue;
    if (!best || distance(me, g) < distance(me, best)) best = g;
  }
  return best;
}

// The core robs the nearest opponent carrier in range, which in a crowd may be a poorer one
// than the prey: steal only when that one is richer too, and walk right onto the prey (no
// arrive stop) until it is the nearest.
function hunt(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  me: Readonly<Ghost>,
  prey: Readonly<Ghost>,
): Intent {
  const d = distance(me, prey);
  const dir = d > 0 ? { dx: (prey.x - me.x) / d, dy: (prey.y - me.y) / d } : IDLE;
  const victim = nearestOpponentCarrier(cfg, s, me);
  const worth = victim !== null && totalCount(victim.carried) > totalCount(me.carried);
  return worth ? { ...dir, action: 'steal' } : dir;
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
        return prey ? hunt(cfg, s, me, prey) : collect(cfg, s, me);
      }
    }
  };
}
