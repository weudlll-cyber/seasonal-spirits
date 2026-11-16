// Seasonal Spirits — the fairness search's yardstick: the grid is complete and unique, and
// "within 40–60 %" (V5, owner decision 2026-11-16) and the distance from an even split mean
// what the owner asked for.

import { describe, expect, it } from 'vitest';
import type { BalanceReport } from './balance.js';
import { distanceFromEven, gridConfigs, meetsTarget } from './fairness.js';

const report = (banker: number, planner: number): BalanceReport =>
  ({ bestPlayerShare: { banker, planner } }) as BalanceReport;

describe('fairness search', () => {
  it('tries every one of the 16 grid configurations of V5 round 1 once', () => {
    const grid = gridConfigs();
    expect(grid).toHaveLength(16);
    expect(new Set(grid.map((c) => JSON.stringify(c))).size).toBe(16);
  });

  it('accepts a configuration only when both styles win 40–60 % of matches', () => {
    expect(meetsTarget(report(0.5, 0.5))).toBe(true);
    expect(meetsTarget(report(0.4, 0.6))).toBe(true);
    expect(meetsTarget(report(0.39, 0.61))).toBe(false);
  });

  it('measures the distance from an even split in points: 0 when even', () => {
    expect(distanceFromEven(report(0.5, 0.5))).toBeCloseTo(0);
    expect(distanceFromEven(report(0, 1))).toBeCloseTo(100);
  });
});
