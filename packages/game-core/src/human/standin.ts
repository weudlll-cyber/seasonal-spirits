// Seasonal Spirits — a stand-in for a human player (session 2026-11-16-HUMAN): it sees only
// what a player's "Near" view shows, decides a reaction time late, and plays like a simple
// collector — the nearest coin it sees, home to secure before every deadline. A measuring
// instrument, never a strategy of the balance pool.

import { deadlineNear, goHomeAndSecure, IDLE, steerTo, type Bot } from '../bots/common.js';
import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { totalCount } from '../seasons.js';
import { perceive, type Sight, type ViewHalfSize } from './perception.js';

// The client's "Near" view (apps/client: `cameraSpan` 1100 field units along the shorter side
// of the screen below the 132 px bar; render `follow`): a desktop window of 1280 × 800 (and
// wider) shows the whole field width and 1100 of its height; a phone in portrait (Pixel 7, 412
// × 915) shows 1100 of the width and the whole height.
export const DESKTOP_VIEW: ViewHalfSize = { x: 1000, y: 550 };
export const PHONE_VIEW: ViewHalfSize = { x: 550, y: 1000 };
export const HUMAN_REACTION_MS = 300; // placeholder — owner decides

export function createStandIn(cfg: GameConfig, sight: Sight): Bot {
  const middle = { x: cfg.fieldSize / 2, y: cfg.fieldSize / 2 };
  return (s, me) => {
    const seen = perceive(cfg.fieldSize, s, me.id, sight);
    if (!seen || seen.me.securingUntilMs !== null || seen.state.ended) return IDLE;
    const { state, me: self } = seen;
    if (totalCount(self.carried) > 0 && deadlineNear(cfg, state, self)) {
      return goHomeAndSecure(cfg, state, self);
    }
    let target: { x: number; y: number } | null = null;
    for (const c of state.coins) {
      if (!target || distance(self, c) < distance(self, target)) target = c;
    }
    // Nothing in view: head for the middle, where the view covers most of the field.
    return steerTo(cfg, self, target ?? middle);
  };
}
