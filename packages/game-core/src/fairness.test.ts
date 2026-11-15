// Seasonal Spirits — the fairness search's yardstick: the grid is complete and unique, and
// "within 25–42 %" and the distance from an even split mean what the owner asked for.

import { describe, expect, it } from 'vitest';
import type { BalanceReport } from './balance.js';
import { distanceFromEven, gridConfigs, meetsTarget } from './fairness.js';

const report = (patient: number, cautious: number, hunter: number): BalanceReport =>
  ({ bestPlayerShare: { patient, cautious, hunter } }) as BalanceReport;

describe('fairness search', () => {
  it('tries every one of the 288 grid configurations once', () => {
    const grid = gridConfigs();
    expect(grid).toHaveLength(288);
    expect(new Set(grid.map((c) => JSON.stringify(c))).size).toBe(288);
  });

  it('accepts a configuration only when all three strategies win 25–42 % of matches', () => {
    expect(meetsTarget(report(0.33, 0.33, 0.34))).toBe(true);
    expect(meetsTarget(report(0.25, 0.33, 0.42))).toBe(true);
    expect(meetsTarget(report(0.24, 0.34, 0.42))).toBe(false);
    expect(meetsTarget(report(0.1, 0.417, 0.483))).toBe(false);
  });

  it('measures the distance from an even split in points: 0 when even', () => {
    expect(distanceFromEven(report(1 / 3, 1 / 3, 1 / 3))).toBeCloseTo(0);
    expect(distanceFromEven(report(0, 0, 1))).toBeCloseTo(133.3, 1);
  });
});
