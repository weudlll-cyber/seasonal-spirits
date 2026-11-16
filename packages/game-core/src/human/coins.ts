// Seasonal Spirits — what happens to a field coin (session 2026-11-16-HUMAN, step 1): from its
// spawn, how far the nearest ghost was, how long until someone picked it up, or whether a
// halving cleared it untouched. Watches a match tick by tick through its events.

import { distance } from '../geometry.js';
import type { MatchState } from '../types.js';

export class CoinLives {
  readonly pickedAfterMs: number[] = []; // spawn to pickup, every picked coin
  readonly nearestAtSpawn: number[] = []; // distance of the nearest ghost when it appeared
  cleared = 0; // gone at a halving, never picked up
  spawned = 0;
  private readonly born = new Map<number, number>(); // coin id → spawn time; only live coins

  observe(s: Readonly<MatchState>): void {
    for (const e of s.events) {
      if (e.type === 'pickup') {
        const at = this.born.get(e.coin);
        if (at !== undefined) this.pickedAfterMs.push(s.elapsedMs - at);
        this.born.delete(e.coin);
      }
      if (e.type === 'halving') {
        // The old season's field coins are gone; the new ones spawn after this.
        this.cleared += this.born.size;
        this.born.clear();
      }
    }
    for (const c of s.coins) {
      if (this.born.has(c.id)) continue;
      this.born.set(c.id, s.elapsedMs);
      this.spawned++;
      this.nearestAtSpawn.push(Math.min(...s.ghosts.map((g) => distance(g, c))));
    }
  }
}
