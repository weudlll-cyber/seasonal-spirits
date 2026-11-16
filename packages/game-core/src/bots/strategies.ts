// Seasonal Spirits — the bot strategies as small state machines. Each picks a mode from the
// public state, then acts on it: patient carries all season and banks before every deadline,
// cautious banks early and before every deadline. The hunter and the swap went with stealing
// and the swap (V5, owner decision 2026-11-16).

import type { GameConfig } from '../config.js';
import { totalCount } from '../seasons.js';
import type { Ghost, MatchState } from '../types.js';
import { collect, deadlineNear, goHomeAndSecure, IDLE, type Bot } from './common.js';

export type Strategy = 'patient' | 'cautious';
export const STRATEGIES: readonly Strategy[] = ['patient', 'cautious'];

type Mode = 'collect' | 'secure';

function patientMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  return totalCount(me.carried) > 0 && deadlineNear(cfg, s, me) ? 'secure' : 'collect';
}

function cautiousMode(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Mode {
  if (totalCount(me.carried) >= cfg.bots.cautiousSecureAt) return 'secure';
  return patientMode(cfg, s, me);
}

export function createBot(cfg: GameConfig, strategy: Strategy): Bot {
  const modeOf = strategy === 'patient' ? patientMode : cautiousMode;
  return (s, me) => {
    if (me.securingUntilMs !== null || s.ended) return IDLE;
    return modeOf(cfg, s, me) === 'collect' ? collect(cfg, s, me) : goHomeAndSecure(cfg, s, me);
  };
}
