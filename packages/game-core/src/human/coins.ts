// Seasonal Spirits — what happens to a field coin (session 2026-11-16-HUMAN, step 1): from its
// spawn, how far the nearest ghost was and how long until someone picked it up (since V5 a
// halving clears no field coins). Watches a match tick by tick through its events.

import { distance } from '../geometry.js';
import type { MatchState } from '../types.js';

export class CoinLives {
  readonly pickedAfterMs: number[] = []; // spawn to pickup, every picked coin
  readonly nearestAtSpawn: number[] = []; // distance of the nearest ghost when it appeared
  spawned = 0;
  private readonly born = new Map<number, number>(); // coin id → spawn time; only live coins

  observe(s: Readonly<MatchState>): void {
    for (const e of s.events) {
      if (e.type === 'pickup') {
        const at = this.born.get(e.coin);
        if (at !== undefined) this.pickedAfterMs.push(s.elapsedMs - at);
        this.born.delete(e.coin);
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
