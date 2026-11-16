// Seasonal Spirits — helpers for the game-core tests: a quiet config and ghost placement.
// Test-only; not exported from the package index.

import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import { shrineOf } from './geometry.js';
import type { Ghost, Intent } from './types.js';

// No spawning unless a test asks for it, so every coin in a test is placed by the test.
export function quietConfig(over: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, coinSpawnPerSecond: 0, ...over };
}

export function matchOf(cfg: GameConfig, roster: Roster[]): Match {
  return new Match(cfg, 1, roster);
}

export function ghost(m: Match, id: number): Ghost {
  const g = m.state.ghosts.find((x) => x.id === id);
  if (!g) throw new Error(`no ghost ${id}`);
  return g;
}

export function placeAtShrine(m: Match, id: number): Ghost {
  const g = ghost(m, id);
  const home = shrineOf(m.state.shrines, g.team);
  g.x = home.x;
  g.y = home.y;
  return g;
}

export function act(m: Match, id: number, intent: Intent, dtMs = 50): void {
  m.tick(dtMs, new Map([[id, intent]]));
}

// Advance match time to `ms` in 50 ms ticks with nobody acting.
export function runTo(m: Match, ms: number): void {
  while (m.state.elapsedMs < ms && !m.state.ended) m.tick(50, new Map());
}
