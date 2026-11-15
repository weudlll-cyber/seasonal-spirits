// Seasonal Spirits — the fairness search (owner decision 2026-11-15: each strategy's best
// player wins between 25 % and 42 % of matches): the grids of configurations to try (values,
// then the rule trials), and how close a balance report comes to an even split. Pure;
// `fairness-cli.ts` runs it.

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
    | 'swapMode'
    | 'swappedStealProof'
    | 'escortRadius'
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

// The rule-trial grid of session 2026-11-15-RULES (R1 swapMode, R2 swappedStealProof,
// R3 escortRadius 50 and 90, both at 1.5 and 2 coins per second): 2 × 2 × 3 × 2 = 24.
export const RULE_GRID = {
  swapMode: ['fixed', 'ratio'],
  swappedStealProof: [false, true],
  escortRadius: [0, 50, 90],
  coinSpawnPerSecond: [1.5, 2],
} as const;

export function ruleGridConfigs(): Overrides[] {
  const out: Overrides[] = [];
  for (const swapMode of RULE_GRID.swapMode)
    for (const swappedStealProof of RULE_GRID.swappedStealProof)
      for (const escortRadius of RULE_GRID.escortRadius)
        for (const coinSpawnPerSecond of RULE_GRID.coinSpawnPerSecond)
          out.push({ swapMode, swappedStealProof, escortRadius, coinSpawnPerSecond });
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
