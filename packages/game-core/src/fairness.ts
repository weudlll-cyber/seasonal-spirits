// Seasonal Spirits — the fairness search (owner decision 2026-11-16, V5: each of the two bot
// styles' best player wins between 40 % and 60 % of matches): the grid of configurations to
// try, and how close a balance report comes to an even split. Pure; `fairness-cli.ts` runs it.

import type { BalanceReport } from './balance.js';
import { STRATEGIES } from './bots/strategies.js';
import type { GameConfig } from './config.js';

export const FAIR_MIN = 0.4;
export const FAIR_MAX = 0.6;
const EVEN = 1 / STRATEGIES.length;

// The changes a configuration makes to DEFAULT_CONFIG.
export type Overrides = Partial<Pick<GameConfig, 'prices' | 'spawnWeights' | 'coinSpawnPerSecond'>>;

// The stage-1 grid of V5 round 1 (CHAIN 2026-11-16-V5, piece 5): 4 price boards × 2 spawn
// weightings × 2 spawn rates = 16 configurations.
export const GRID = {
  prices: [
    { inSeason: 4, next: 2, other: 1 },
    { inSeason: 3, next: 2, other: 1 },
    { inSeason: 5, next: 2, other: 1 },
    { inSeason: 4, next: 3, other: 1 },
  ],
  spawnWeights: [
    { inSeason: 1, next: 1, other: 1 }, // every season equally often
    { inSeason: 0.5, next: 1, other: 1 }, // the season in season at half weight
  ],
  coinSpawnPerSecond: [2, 3],
} as const;

export function gridConfigs(): Overrides[] {
  const out: Overrides[] = [];
  for (const prices of GRID.prices)
    for (const spawnWeights of GRID.spawnWeights)
      for (const coinSpawnPerSecond of GRID.coinSpawnPerSecond)
        out.push({ prices: { ...prices }, spawnWeights: { ...spawnWeights }, coinSpawnPerSecond });
  return out;
}

// Sum of the distances of the best-player shares from an even split, in points (0 = even).
export function distanceFromEven(r: BalanceReport): number {
  return STRATEGIES.reduce((sum, s) => sum + Math.abs(r.bestPlayerShare[s] - EVEN), 0) * 100;
}

// Every style's best player wins between FAIR_MIN and FAIR_MAX of the matches.
export function meetsTarget(r: BalanceReport): boolean {
  return STRATEGIES.every((s) => {
    const share = r.bestPlayerShare[s];
    return share >= FAIR_MIN && share <= FAIR_MAX;
  });
}
