// Seasonal Sumo — the sumo mode's own rules: at every halving the arena's area halves (its edge
// eases in, arena.ts); after the moves a ghost off the edge falls and the last opponent that
// touched it scores (falls.ts).

import { halveArena } from '../arena.js';
import type { GameConfig } from '../config.js';
import { checkFalls } from '../falls.js';
import type { ModeRules } from './rules.js';

export function sumoRules(cfg: GameConfig): ModeRules {
  return {
    start: () => undefined,
    turn: (s) => {
      halveArena(s.arena, s.elapsedMs);
    },
    after: (s) => {
      checkFalls(cfg, s);
    },
  };
}
