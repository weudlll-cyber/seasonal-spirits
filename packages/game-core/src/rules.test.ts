// Seasonal Spirits — the swap and steal rules adopted on 2026-11-16 (BALANCE.md "Round 5" to
// "Round 7"): swap from swapMinIn coins, never in the last season; swapped coins steal-proof
// until the next halving or a secure. Each steal check asks that the lit Steal flag
// (canSteal) and the steal itself (trySteal) agree.

import { describe, expect, it } from 'vitest';
import { canSteal, carriesShielded, shrineOffer } from './actions.js';
import type { GameConfig } from './config.js';
import type { Match } from './match.js';
import { act, ghost, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';

const pair = [
  { id: 1, team: 0 as const }, // the carrier
  { id: 2, team: 1 as const }, // the thief
];

function swapAt(cfg: GameConfig, coins: number): { m: Match; got: number } {
  const m = matchOf(cfg, pair);
  const g = placeAtShrine(m, 1);
  g.carried.spring = coins;
  act(m, 1, { dx: 0, dy: 0, action: 'swap' });
  return { m, got: g.carried.summer };
}

// Thief 40 units from the carrier: in range, not pushed apart.
function standoff(m: Match): void {
  Object.assign(ghost(m, 1), { x: 1000, y: 1000 });
  Object.assign(ghost(m, 2), { x: 1040, y: 1000 });
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

describe('swap from swapMinIn coins', () => {
  const cfg = quietConfig();

  it('swaps from 6 coins at the same rate, rounded down: 6 → 9, 7 → 10, 8 → 12, 10 → 15', () => {
    for (const [coins, got] of [
      [6, 9],
      [7, 10],
      [8, 12],
      [10, 15],
    ] as const) {
      expect(swapAt(cfg, coins).got, `${coins} coins`).toBe(got);
    }
    expect(swapAt(cfg, 5).got).toBe(0);
  });

  it('offers exactly what the swap gives, its value now and later', () => {
    const m = matchOf(cfg, pair);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 6;
    expect(shrineOffer(cfg, m.state, g)).toMatchObject({
      swapCoins: 9,
      swapValueNow: 4.5,
      swapValueLater: 9,
    });
  });

  it('neither offers nor makes a swap in the last season', () => {
    const m = matchOf(cfg, pair);
    runTo(m, 3 * cfg.seasonDurationMs + 1000);
    const g = placeAtShrine(m, 1);
    g.carried[m.state.clock.current] = 8;
    expect(shrineOffer(cfg, m.state, g).swapCoins).toBe(0);
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried[m.state.clock.current]).toBe(8);
  });
});

describe('swapped coins are steal-proof until the next halving', () => {
  const cfg = quietConfig();

  it('keeps swapped coins from a steal and makes a carrier of only those no target', () => {
    const { m } = swapAt(cfg, 10); // 15 Summer coins, all shielded
    expect(carriesShielded(ghost(m, 1))).toBe(true);
    standoff(m);
    expect(stealAgrees(m)).toEqual({ lit: false, took: 0 });
    ghost(m, 1).carried.spring = 4; // picked up later: those can be taken
    runTo(m, 2000); // the thief's cooldown is long over
    const { took } = stealAgrees(m);
    expect(took).toBe(2);
    expect(ghost(m, 1).carried.summer).toBe(15);
  });

  it('protects only until the next halving', () => {
    const { m } = swapAt(cfg, 10);
    runTo(m, cfg.seasonDurationMs + 100); // the halving: Summer is in season
    expect(carriesShielded(ghost(m, 1))).toBe(false);
    standoff(m);
    expect(stealAgrees(m).took).toBe(8); // half of 15, rounded up
  });

  it('ends with a secure', () => {
    const { m } = swapAt(cfg, 10);
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    runTo(m, cfg.secureDurationMs + 100);
    expect(ghost(m, 1).securedValue).toBe(7.5);
    expect(carriesShielded(ghost(m, 1))).toBe(false);
  });
});
