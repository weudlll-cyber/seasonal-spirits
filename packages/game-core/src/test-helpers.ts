// Seasonal Sumo — helpers for the game-core tests: a match, a ghost by id, placing ghosts.
// Test-only; not exported from the package index.

import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { Match, type Roster } from './match.js';
import type { Ghost, Intent } from './types.js';

export const cfg: GameConfig = DEFAULT_CONFIG;

export function matchOf(c: GameConfig, roster: Roster[]): Match {
  return new Match(c, 1, roster);
}

export function ghost(m: Match, id: number): Ghost {
  const g = m.state.ghosts.find((x) => x.id === id);
  if (!g) throw new Error(`no ghost ${id}`);
  return g;
}

// A ghost at a point relative to the arena's centre, standing still.
export function place(m: Match, id: number, dx: number, dy: number): Ghost {
  const g = ghost(m, id);
  Object.assign(g, {
    x: m.state.arena.centre.x + dx,
    y: m.state.arena.centre.y + dy,
    vx: 0,
    vy: 0,
  });
  return g;
}

export function act(m: Match, id: number, intent: Intent, dtMs = 50): void {
  m.tick(dtMs, new Map([[id, intent]]));
}

// Advance match time to `ms` in 50 ms ticks with nobody acting.
export function runTo(m: Match, ms: number): void {
  while (m.state.elapsedMs < ms && !m.state.ended) m.tick(50, new Map());
}
