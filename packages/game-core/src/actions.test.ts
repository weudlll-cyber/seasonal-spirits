// Seasonal Spirits — swap, secure and steal, including every way a request can be refused.

import { describe, expect, it } from 'vitest';
import { act, ghost, matchOf, placeAtShrine, quietConfig, runTo } from './test-helpers.js';

describe('swap at the own shrine', () => {
  it('turns 10 coins of the current season into 15 of the next', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried).toEqual({ spring: 0, summer: 15, autumn: 0, winter: 0 });
  });

  it('reproduces the patient path 10 → 15 → 22 → 33 when never robbed', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    runTo(m, 76_000);
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    runTo(m, 151_000);
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried).toEqual({ spring: 0, summer: 0, autumn: 0, winter: 33 });
  });

  it('is refused with fewer than 10 coins of the current season', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 9;
    g.carried.summer = 20;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried).toEqual({ spring: 9, summer: 20, autumn: 0, winter: 0 });
  });

  it('is refused away from the own shrine and at another team’s shrine', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    g.carried.spring = 10;
    g.x = 1000;
    g.y = 1000;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    const other = m.state.shrines[1];
    g.x = other?.x ?? 0;
    g.y = other?.y ?? 0;
    act(m, 1, { dx: 0, dy: 0, action: 'swap' });
    expect(g.carried.spring).toBe(10);
  });
});

describe('secure at the own shrine', () => {
  it('banks the current value after the configured time and stands still meanwhile', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    const x = g.x;
    g.carried.spring = 10;
    g.carried.summer = 15;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    act(m, 1, { dx: 1, dy: 0 }, cfg.secureDurationMs - 100);
    expect(g.securedValue).toBe(0);
    expect(g.x).toBe(x);
    act(m, 1, { dx: 1, dy: 0 }, 100);
    expect(g.securedValue).toBe(10 + 7.5); // "Swap (15 Summer, worth 7 now / 15 later)"
    expect(g.carried).toEqual({ spring: 0, summer: 0, autumn: 0, winter: 0 });
  });

  it('is refused away from the own shrine and with nothing carried', () => {
    const m = matchOf(quietConfig(), [
      { id: 1, team: 0 },
      { id: 2, team: 0 },
    ]);
    const away = ghost(m, 1);
    away.carried.spring = 5;
    away.x = 1000;
    away.y = 1000;
    placeAtShrine(m, 2);
    m.tick(
      50,
      new Map([
        [1, { dx: 0, dy: 0, action: 'secure' }],
        [2, { dx: 0, dy: 0, action: 'secure' }],
      ]),
    );
    expect(m.state.ghosts.every((g) => g.securingUntilMs === null)).toBe(true);
  });

  it('a cautious player who secures early keeps the value through every halving', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    runTo(m, 300_000);
    expect(m.result().players[0]?.secured).toBe(10);
  });
});

// Ghost 1 (team 0) carries 10 spring coins; ghost 2 stands `gap` units to its right.
function duel(thiefTeam: 0 | 1, gap: number) {
  const m = matchOf(quietConfig(), [
    { id: 1, team: 0 },
    { id: 2, team: thiefTeam },
  ]);
  const victim = ghost(m, 1);
  const thief = ghost(m, 2);
  victim.x = 1000;
  victim.y = 1000;
  thief.x = 1000 + gap;
  thief.y = 1000;
  victim.carried.spring = 10;
  return { m, victim, thief };
}

describe('steal target', () => {
  it('takes the configured share from the nearest opponent carrier in range', () => {
    const { m, victim, thief } = duel(1, 30);
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    expect(victim.carried.spring).toBe(5);
    expect(thief.carried.spring).toBe(5);
  });

  it('never takes from a teammate', () => {
    const { m, victim } = duel(0, 30);
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    expect(victim.carried.spring).toBe(10);
  });

  it('never takes from the thief itself', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    g.carried.spring = 10;
    act(m, 1, { dx: 0, dy: 0, action: 'steal' });
    expect(g.carried.spring).toBe(10);
  });

  it('does nothing out of range', () => {
    const cfg = quietConfig();
    const { m, victim } = duel(1, cfg.stealRange + 1);
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    expect(victim.carried.spring).toBe(10);
  });
});

describe('steal timing', () => {
  it('waits for the cooldown before the next steal', () => {
    const { m, victim } = duel(1, 30);
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    expect(victim.carried.spring).toBe(5);
    act(m, 2, { dx: 0, dy: 0 }, 1000);
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    expect(victim.carried.spring).toBe(2);
  });

  it('interrupts a secure in progress', () => {
    const { m, victim } = duel(1, 30);
    const home = m.state.shrines[0];
    victim.x = home?.x ?? 0;
    victim.y = home?.y ?? 0;
    const thief = ghost(m, 2);
    thief.x = victim.x + 30;
    thief.y = victim.y;
    act(m, 1, { dx: 0, dy: 0, action: 'secure' });
    act(m, 2, { dx: 0, dy: 0, action: 'steal' });
    runTo(m, 10_000);
    expect(victim.securingUntilMs).toBeNull();
    expect(victim.securedValue).toBe(0);
  });
});
