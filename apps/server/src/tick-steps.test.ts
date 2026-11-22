// Seasonal Spirits — tick-steps tests: late callbacks catch up, a long gap does not block.
// Protects the bound that keeps the server answering after the PC wakes from standby.

import { describe, expect, it } from 'vitest';
import { stepsDue } from './tick-steps.js';

describe('stepsDue', () => {
  it('catches a late callback up in full and keeps the remainder', () => {
    expect(stepsDue(0, 120, 50)).toEqual({ steps: 2, carryMs: 20 });
    expect(stepsDue(20, 30, 50)).toEqual({ steps: 1, carryMs: 0 });
  });

  it('runs no step before a whole step has passed', () => {
    expect(stepsDue(10, 30, 50)).toEqual({ steps: 0, carryMs: 40 });
  });

  it('after hours of standby runs one second of steps, not every missed one', () => {
    const fiveHours = 5 * 3600 * 1000;
    expect(stepsDue(0, fiveHours, 50)).toEqual({ steps: 20, carryMs: 0 });
  });

  it('a clock that steps back owes nothing new', () => {
    expect(stepsDue(30, -5000, 50)).toEqual({ steps: 0, carryMs: 30 });
  });
});
