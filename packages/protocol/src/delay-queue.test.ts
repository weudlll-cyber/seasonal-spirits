// Seasonal Spirits — delay queue tests: order preserved and bounds respected.

import { describe, expect, it } from 'vitest';
import { DelayQueue, type DelayQueueClock, type Random } from './delay-queue.js';

interface Pending {
  at: number;
  fn: () => void;
}

class FakeClock implements DelayQueueClock {
  time = 0;
  private pending: Pending[] = [];

  now(): number {
    return this.time;
  }

  schedule(delayMs: number, fn: () => void): void {
    this.pending.push({ at: this.time + Math.max(0, delayMs), fn });
    this.pending.sort((a, b) => a.at - b.at);
  }

  advanceTo(t: number): void {
    let next = this.pending[0];
    while (next !== undefined && next.at <= t) {
      this.pending.shift();
      this.time = next.at;
      next.fn();
      next = this.pending[0];
    }
    this.time = t;
  }
}

class SeqRng implements Random {
  constructor(private readonly values: number[]) {}
  private i = 0;
  next(): number {
    const v = this.values[this.i % this.values.length];
    this.i++;
    if (v === undefined) throw new Error('SeqRng: no values');
    return v;
  }
}

describe('DelayQueue', () => {
  it('preserves order even when a later sample is smaller', () => {
    const clock = new FakeClock();
    const rng = new SeqRng([0.9, 0.0]); // first delayed by max, second by min
    const delivered: number[] = [];
    const q = new DelayQueue<number>(100, 200, (n) => delivered.push(n), { clock, rng });
    q.push(1);
    q.push(2);
    clock.advanceTo(1000);
    expect(delivered).toEqual([1, 2]);
  });

  it('stays within bounds for a single item', () => {
    const clock = new FakeClock();
    const rng = new SeqRng([0.5]);
    let deliveredAt = -1;
    const q = new DelayQueue<number>(
      100,
      200,
      () => {
        deliveredAt = clock.now();
      },
      { clock, rng },
    );
    q.push(1);
    clock.advanceTo(1000);
    expect(deliveredAt).toBeGreaterThanOrEqual(100);
    expect(deliveredAt).toBeLessThanOrEqual(200);
  });

  it('0/0 becomes a pass-through (synchronous)', () => {
    const clock = new FakeClock();
    const rng = new SeqRng([0.5]);
    const delivered: number[] = [];
    const q = new DelayQueue<number>(0, 0, (n) => delivered.push(n), { clock, rng });
    q.push(1);
    q.push(2);
    expect(delivered).toEqual([1, 2]);
  });
});
