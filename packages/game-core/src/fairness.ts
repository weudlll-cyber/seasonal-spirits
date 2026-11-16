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
export type Overrides = Partial<
  Pick<GameConfig, 'coinSpawnPerSecond' | 'carrySpeedFactor' | 'secureDurationMs'>
>;

export const GRID = {
  coinSpawnPerSecond: [1, 1.5, 2, 3],
  carrySpeedFactor: [0.5, 0.7, 0.85],
  secureDurationMs: [2000, 3000], // CONCEPT.md §2a: 2–3 s
} as const;

export function gridConfigs(): Overrides[] {
  const out: Overrides[] = [];
  for (const coinSpawnPerSecond of GRID.coinSpawnPerSecond)
    for (const carrySpeedFactor of GRID.carrySpeedFactor)
      for (const secureDurationMs of GRID.secureDurationMs)
        out.push({ coinSpawnPerSecond, carrySpeedFactor, secureDurationMs });
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
