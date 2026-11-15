// Seasonal Spirits — the halving (CONCEPT.md §2b, §13): every season turn inside a match.
// The old season's coins on the field disappear and from now on only the new season's coins
// fall, at the same rate. Carried coins are not touched: outside its season a coin is worth
// half (seasons.ts, valueNow), so every halving is a deadline to swap or secure.

import { SEASONS, totalCount } from './seasons.js';
import type { MatchState } from './types.js';

export function applyHalving(s: MatchState): void {
  const cleared = s.coins.length;
  s.coins = [];
  s.stats.cleared += cleared;
  // Rule trial R2: swapped coins are steal-proof only until the next halving.
  for (const g of s.ghosts) for (const season of SEASONS) g.shielded[season] = 0;
  s.events.push({
    type: 'halving',
    atMs: s.elapsedMs,
    season: s.clock.current,
    fieldCoinsCleared: cleared,
    carried: s.ghosts.reduce((n, g) => n + totalCount(g.carried), 0),
  });
}
