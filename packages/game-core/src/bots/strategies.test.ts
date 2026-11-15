// Seasonal Spirits — the bots before a halving: patient swaps, cautious secures, both in time.

import { describe, expect, it } from 'vitest';
import { createBot } from './strategies.js';
import { ghost, matchOf, placeAtShrine, quietConfig, runTo } from '../test-helpers.js';

describe('bots before a halving', () => {
  it('a patient bot holds 10 coins mid-season and swaps them at its shrine before the turn', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'patient');
    const g = placeAtShrine(m, 1);
    g.carried.spring = 10;
    runTo(m, 30_000);
    expect(bot(m.state, g).action).toBeUndefined();
    runTo(m, 75_000 - cfg.secureDurationMs - cfg.bots.deadlineMarginMs);
    expect(bot(m.state, g).action).toBe('swap');
  });

  it('a cautious bot secures even one coin before the turn instead of letting it lose value', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'cautious');
    const g = placeAtShrine(m, 1);
    g.carried.spring = 1;
    runTo(m, 30_000);
    expect(bot(m.state, g).action).toBeUndefined();
    runTo(m, 75_000 - cfg.secureDurationMs - cfg.bots.deadlineMarginMs);
    expect(bot(m.state, g).action).toBe('secure');
  });

  it('starts walking home early enough to cross the field at carrying speed', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'cautious');
    const g = ghost(m, 1);
    g.carried.spring = 1;
    g.x = cfg.fieldSize; // the far corner from team 0's shrine
    g.y = cfg.fieldSize;
    // A coin of its own just above it: until it turns home it goes for that coin.
    m.state.coins.push({ id: 999, x: cfg.fieldSize, y: cfg.fieldSize - 200, season: 'spring' });
    // The walk home is about 12 s; with the secure and the margin, about 17.6 s are needed.
    runTo(m, 55_000); // 20 s left: not yet
    expect(bot(m.state, g)).toEqual({ dx: 0, dy: -1 });
    runTo(m, 58_000); // 17 s left: on the way
    const step = bot(m.state, g);
    expect(step.dx).toBeLessThan(0);
    expect(step.dy).toBeLessThan(0);
  });
});
