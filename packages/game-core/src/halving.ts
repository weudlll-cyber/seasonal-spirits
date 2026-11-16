// Seasonal Spirits — the halving (CONCEPT.md V5, sentence 3): every season turn inside a
// match the next season comes into season and the prices move on (prices.ts). Nothing on the
// field or in a ghost's hands changes — field coins stay, carried coins keep their count —
// only what each is worth; the event marks the turn for the clients and the measurements.
// Every coin a ghost carries now has crossed a halving (the recap's "Best nose", recap.ts) —
// unless it is securing: that secure's prices were fixed before the halving.

import { totalCount } from './seasons.js';
import type { MatchState } from './types.js';

export function applyHalving(s: MatchState): void {
  for (const g of s.ghosts) if (g.securingUntilMs === null) g.crossed = { ...g.carried };
  s.events.push({
    type: 'halving',
    atMs: s.elapsedMs,
    season: s.clock.current,
    carried: s.ghosts.reduce((n, g) => n + totalCount(g.carried), 0),
  });
}
