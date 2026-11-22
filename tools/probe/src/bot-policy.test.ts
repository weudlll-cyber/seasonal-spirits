// Seasonal Spirits — bot policy tests: direction change interval in [0.5, 2.0] s, wall turn.
// The probe's bots move like players so the measured load is realistic.

import { describe, expect, it } from 'vitest';
import { BotPolicy } from './bot-policy.js';

class FakeClock {
  t = 0;
  now(): number {
    return this.t;
  }
}

describe('BotPolicy', () => {
  it('samples the next turn time in [0.5, 2.0] seconds', () => {
    const clock = new FakeClock();
    for (let seed = 0; seed < 20; seed++) {
      const rng = seqRng([0.1 * seed, 0.5, 0.9, 0.1]);
      const p = new BotPolicy({ worldSize: 2000, wallMargin: 50, rng, clock });
      const delta = p.nextTurnTime - clock.now();
      expect(delta).toBeGreaterThanOrEqual(500);
      expect(delta).toBeLessThanOrEqual(2000);
    }
  });

  it('picks a new direction when the turn time arrives', () => {
    const clock = new FakeClock();
    const rng = seqRng([0.0, 0.0, 0.25, 0.0]); // first dir angle=0 → (1,0); then at 0.5 s
    const p = new BotPolicy({ worldSize: 2000, wallMargin: 50, rng, clock });
    const d0 = p.tick(1000, 1000);
    expect(d0.dx).toBeCloseTo(1);
    expect(d0.dy).toBeCloseTo(0);
    // Advance past the first scheduled turn.
    clock.t = p.nextTurnTime + 1;
    const d1 = p.tick(1000, 1000);
    // angle = 0.25 * 2π = π/2 → (0, 1)
    expect(d1.dy).toBeGreaterThan(0.9);
  });

  it('flips inward when near the wall', () => {
    const clock = new FakeClock();
    const rng = seqRng([0.0, 0.5]); // angle 0 → (1, 0), heading right
    const p = new BotPolicy({ worldSize: 1000, wallMargin: 50, rng, clock });
    // Right at the right wall, direction is still +x — policy must flip.
    const d = p.tick(960, 500);
    expect(d.dx).toBeLessThan(0);
  });
});

function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i++ % values.length];
    if (v === undefined) throw new Error('seqRng: no values');
    return v;
  };
}
