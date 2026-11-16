// Seasonal Spirits — the price board of V5 (owner decision 2026-11-16, CONCEPT.md §2a): what a
// coin is worth depends only on how its season stands to the season in season — in season,
// next, or one of the other two. The one price function securing, the wire and the client
// use; and the same relation weights which season a new field coin belongs to.

import type { GameConfig } from './config.js';
import { SEASONS, nextSeason, type Season, type SeasonCounts } from './seasons.js';

export type Relation = 'inSeason' | 'next' | 'other';
export const RELATIONS: readonly Relation[] = ['inSeason', 'next', 'other'];

export function relationOf(coin: Season, current: Season): Relation {
  if (coin === current) return 'inSeason';
  return coin === nextSeason(current) ? 'next' : 'other';
}

// What one coin of `coin`'s season is worth while `current` is in season.
export function priceOf(cfg: Pick<GameConfig, 'prices'>, coin: Season, current: Season): number {
  return cfg.prices[relationOf(coin, current)];
}

// The value of carried coins if banked now: each coin at its season's current price.
export function valueNow(
  cfg: Pick<GameConfig, 'prices'>,
  carried: SeasonCounts,
  current: Season,
): number {
  let v = 0;
  for (const s of SEASONS) v += carried[s] * priceOf(cfg, s, current);
  return v;
}

// The season of a new field coin: each season weighted by its relation to the season in
// season (`spawnWeights`), drawn with `r` in [0, 1) from the match's seeded random source.
// All weights 0 would leave nothing to draw from; the season in season is the fallback.
export function spawnSeason(
  cfg: Pick<GameConfig, 'spawnWeights'>,
  current: Season,
  r: number,
): Season {
  const weights = SEASONS.map((s) => cfg.spawnWeights[relationOf(s, current)]);
  const total = weights.reduce((a, b) => a + b, 0);
  let left = r * total;
  for (const [i, s] of SEASONS.entries()) {
    left -= weights[i] ?? 0;
    if (left < 0) return s;
  }
  return current;
}
