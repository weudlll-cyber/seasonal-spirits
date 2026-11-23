// Seasonal Sumo — the match's rules as the drawing needs them (sizes, trail speed, fall and jump
// times, respawn band), from the running config each frame (useShape); until then the defaults.

import { DEFAULT_CONFIG, type GameConfig } from '@seasonal-spirits/game-core';

let current: Readonly<GameConfig> = DEFAULT_CONFIG;

export function useShape(cfg: Readonly<GameConfig>): void {
  current = cfg;
}

export function shape(): Readonly<GameConfig> {
  return current;
}
