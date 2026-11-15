// Seasonal Spirits — the three rule trials (owner decision 2026-11-15, BALANCE.md "Round 4"):
// R1 swap from fewer coins ('ratio'), R2 swapped coins steal-proof until the next halving,
// R3 an escorted carrier cannot be robbed. Each checks that the lit Steal flag (canSteal)
// and the steal itself (trySteal) agree, and the defaults are today's game.

import { describe, expect, it } from 'vitest';
import { canSteal, shrineOffer } from './actions.js';
import type { GameConfig } from './config.js';
import type { Match } from './match.js';
import { act, ghost, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';

const trio = [
  { id: 1, team: 0 as const }, // the carrier
  { id: 2, team: 1 as const }, // the thief
  { id: 3, team: 0 as const }, // the carrier's teammate
];

function swapAt(cfg: GameConfig, coins: number): { m: Match; got: number } {
  const m = matchOf(cfg, trio);
  const g = placeAtShrine(m, 1);
  g.carried.spring = coins;
  act(m, 1, { dx: 0, dy: 0, action: 'swap' });
  return { m, got: g.carried.summer };
}

// Thief 40 units from the carrier (in range, not pushed apart), teammate far away.
function standoff(m: Match): void {
  Object.assign(ghost(m, 1), { x: 1000, y: 1000 });
  Object.assign(ghost(m, 2), { x: 1040, y: 1000 });
  Object.assign(ghost(m, 3), { x: 1500, y: 1500 });
}

// The Steal flag and the steal agree: lit exactly when a steal takes something.
function stealAgrees(m: Match): { lit: boolean; took: number } {
  const lit = canSteal(m.cfg, m.state, ghost(m, 2));
  const before = ghost(m, 1).carried.summer + ghost(m, 1).carried.spring;
  act(m, 2, { dx: 0, dy: 0, action: 'steal' });
  const took = before - ghost(m, 1).carried.summer - ghost(m, 1).carried.spring;
  expect(took > 0, 'the Steal flag agrees with the steal').toBe(lit);
  return { lit, took };
}

describe('R1 swapMode ratio', () => {
  const ratio = quietConfig({ swapMode: 'ratio', swapMinIn: 6 });

  it('swaps from 6 coins at the same rate, rounded down: 6 → 9, 7 → 10, 8 → 12, 10 → 15', () => {
    for (const [coins, got] of [
      [6, 9],
      [7, 10],
      [8, 12],
      [10, 15],
    ] as const) {
      expect(swapAt(ratio, coins).got, `${coins} coins`).toBe(got);
    }
    expect(swapAt(ratio, 5).got).toBe(0);
  });

  it('offers exactly what the swap gives, its value now and later', () => {
    const m = matchOf(ratio, trio);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 6;
    expect(shrineOffer(ratio, m.state, g)).toMatchObject({
      swapCoins: 9,
      swapValueNow: 4.5,
      swapValueLater: 9,
    });
  });

  it('does not swap in the last season', () => {
    const m = matchOf(ratio, trio);
    runTo(m, 3 * ratio.seasonDurationMs + 1000);
    const g = placeAtShrine(m, 1);
    g.carried[m.state.clock.current] = 8;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried[m.state.clock.current]).toBe(8);
  });

  it('keeps today’s rule by default: fewer than 10 coins give no swap', () => {
    expect(swapAt(quietConfig(), 8).got).toBe(0);
    expect(swapAt(quietConfig(), 10).got).toBe(15);
  });
});

describe('R2 swappedStealProof', () => {
  const proof = quietConfig({ swappedStealProof: true });

  it('keeps swapped coins from a steal and makes a carrier of only those no target', () => {
    const { m } = swapAt(proof, 10); // 15 Summer coins, all shielded
    standoff(m);
    expect(stealAgrees(m)).toEqual({ lit: false, took: 0 });
    ghost(m, 1).carried.spring = 4; // picked up later: those can be taken
    runTo(m, 2000); // the thief's cooldown is long over
    const { took } = stealAgrees(m);
    expect(took).toBe(2);
    expect(ghost(m, 1).carried.summer).toBe(15);
  });

  it('protects only until the next halving', () => {
    const { m } = swapAt(proof, 10);
    runTo(m, proof.seasonDurationMs + 100); // the halving: Summer is in season
    standoff(m);
    expect(stealAgrees(m).took).toBe(8); // half of 15, rounded up
  });

  it('protects nothing by default', () => {
    const { m } = swapAt(quietConfig(), 10);
    standoff(m);
    expect(stealAgrees(m).took).toBe(8);
  });
});

describe('R3 escortRadius', () => {
  const escort = quietConfig({ escortRadius: 50 });

  it('blocks a steal from a carrier with a teammate within the radius, and unblocks it', () => {
    const m = matchOf(escort, trio);
    standoff(m);
    ghost(m, 1).carried.spring = 6;
    Object.assign(ghost(m, 3), { x: 960, y: 1000 }); // teammate 40 away: escorted
    expect(stealAgrees(m)).toEqual({ lit: false, took: 0 });
    Object.assign(ghost(m, 3), { x: 900, y: 1000 }); // 100 away: alone again
    expect(stealAgrees(m).took).toBe(3);
  });

  it('blocks nothing by default (radius 0)', () => {
    const m = matchOf(quietConfig(), trio);
    standoff(m);
    ghost(m, 1).carried.spring = 6;
    Object.assign(ghost(m, 3), { x: 960, y: 1000 });
    expect(stealAgrees(m).took).toBe(3);
  });
});
