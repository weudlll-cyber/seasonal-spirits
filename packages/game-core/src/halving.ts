// Seasonal Sumo — the halving at every season turn inside a match (1:15, 2:30, 3:45): the next
// season comes into season and the arena's area halves — its edge eases in over
// arenaShrinkMs (arena.ts). The event marks the turn for the clients and the measurements.

import { halveArena } from './arena.js';
import type { MatchState } from './types.js';

export function applyHalving(s: MatchState): void {
  halveArena(s.arena, s.elapsedMs);
  s.events.push({
    type: 'halving',
    atMs: s.elapsedMs,
    season: s.clock.current,
    radius: s.arena.target,
  });
}
