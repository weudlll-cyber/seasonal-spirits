// Seasonal Sumo — the rules of the match on screen, as the drawing needs them: the ghosts' size,
// the walking speed a trail starts above, the fall's and the jump's times, the respawn band
// (NIGHT 2026-11-18: every one a setting, so the drawing no longer takes the defaults). The
// player client and the viewer hand it the running match's config every frame (useShape, from
// the server's tuning when it sends one); until then the defaults.

import { DEFAULT_CONFIG, type GameConfig } from '@seasonal-spirits/game-core';

let current: Readonly<GameConfig> = DEFAULT_CONFIG;

export function useShape(cfg: Readonly<GameConfig>): void {
  current = cfg;
}

export function shape(): Readonly<GameConfig> {
  return current;
}
