// Seasonal Spirits — the fairness search (owner decision 2026-11-15: each strategy's best
// player wins between 25 % and 42 % of matches): the grid of configurations to try, and how
// close a balance report comes to an even split. Pure; `fairness-cli.ts` runs it.

import type { BalanceReport } from './balance.js';
import { STRATEGIES } from './bots/strategies.js';
import type { GameConfig } from './config.js';

export const FAIR_MIN = 0.25;
export const FAIR_MAX = 0.42;
const EVEN = 1 / 3;

// The changes a configuration makes to DEFAULT_CONFIG.
export type Overrides = Partial<
  Pick<
    GameConfig,
    | 'stealShare'
    | 'coinSpawnPerSecond'
    | 'carrySpeedFactor'
    | 'stealCooldownMs'
    | 'secureDurationMs'
    | 'swapOut'
  >
>;

// The stage-1 grid of session 2026-11-15-CD: 4 × 4 × 3 × 3 × 2 = 288 configurations.
export const GRID = {
  stealShare: [0.15, 0.25, 0.35, 0.5],
  coinSpawnPerSecond: [1, 1.5, 2, 3],
  carrySpeedFactor: [0.5, 0.7, 0.85],
  stealCooldownMs: [1000, 2000, 3000],
  secureDurationMs: [2000, 3000], // CONCEPT.md §2a: 2–3 s
} as const;

export function gridConfigs(): Overrides[] {
  const out: Overrides[] = [];
  for (const stealShare of GRID.stealShare)
    for (const coinSpawnPerSecond of GRID.coinSpawnPerSecond)
      for (const carrySpeedFactor of GRID.carrySpeedFactor)
        for (const stealCooldownMs of GRID.stealCooldownMs)
          for (const secureDurationMs of GRID.secureDurationMs)
            out.push({
              stealShare,
              coinSpawnPerSecond,
              carrySpeedFactor,
              stealCooldownMs,
              secureDurationMs,
            });
  return out;
}

// Sum of the distances of the three best-player shares from 33.3 %, in points (0 = even).
export function distanceFromEven(r: BalanceReport): number {
  return STRATEGIES.reduce((sum, s) => sum + Math.abs(r.bestPlayerShare[s] - EVEN), 0) * 100;
}

// Every strategy's best player wins between 25 % and 42 % of the matches.
export function meetsTarget(r: BalanceReport): boolean {
  return STRATEGIES.every((s) => {
    const share = r.bestPlayerShare[s];
    return share >= FAIR_MIN && share <= FAIR_MAX;
  });
}
