// Seasonal Spirits — the halving (CONCEPT.md §2b), the big event of a match.
// Every carried, unsecured coin count is halved; the halves go to the centre pool. Secured
// value is untouched. The spawn rate drop after it lives in field.ts.

import { SEASONS, totalCount } from './seasons.js';
import type { MatchState } from './types.js';

export function applyHalving(s: MatchState): void {
  let before = 0;
  let after = 0;
  for (const g of s.ghosts) {
    before += totalCount(g.carried);
    for (const season of SEASONS) {
      // The ghost keeps the lower half; an odd coin goes to the pool with the other half.
      const keep = Math.floor(g.carried[season] / 2);
      s.pool[season] += g.carried[season] - keep;
      g.carried[season] = keep;
    }
    after += totalCount(g.carried);
  }
  const pooled = before - after;
  s.stats.pooled += pooled;
  s.halvingDone = true;
  s.events.push({
    type: 'halving',
    atMs: s.elapsedMs,
    carriedBefore: before,
    carriedAfter: after,
    pooled,
  });
}
