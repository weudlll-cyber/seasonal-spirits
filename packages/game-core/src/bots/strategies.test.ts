// Seasonal Spirits — the two bot styles of V5: the banker secures early and before every
// deadline and goes for today's valuable coins; the planner goes for the next season's coins,
// holds them across the halving and secures right after it, and before the match end; both
// leave for home early enough.

import { describe, expect, it } from 'vitest';
import { createBot } from './strategies.js';
import { ghost, matchOf, placeAtShrine, quietConfig, runTo } from '../test-helpers.js';

const cfg = quietConfig();
const BEFORE_HALVING = 75_000 - cfg.secureDurationMs - cfg.bots.deadlineMarginMs;

describe('banker', () => {
  it("secures as soon as its load is worth bankerSecureValue at today's prices", () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'banker');
    const g = placeAtShrine(m, 1);
    g.carried.winter = 2; // 2 × 1 in spring: below the threshold
    expect(bot(m.state, g).action).toBeUndefined();
    g.carried.spring = 3; // + 3 × 4 = 14
    expect(bot(m.state, g).action).toBe('secure');
  });

  it('secures even one coin before the halving', () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'banker');
    const g = placeAtShrine(m, 1);
    g.carried.spring = 1;
    runTo(m, 30_000);
    expect(bot(m.state, g).action).toBeUndefined();
    runTo(m, BEFORE_HALVING);
    expect(bot(m.state, g).action).toBe('secure');
  });

  it('goes for the coin in season over a cheaper one equally far away', () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'banker');
    const g = ghost(m, 1);
    Object.assign(g, { x: 1000, y: 1000 });
    m.state.coins.push({ id: 1, x: 1200, y: 1000, season: 'winter' }); // 1 in spring
    m.state.coins.push({ id: 2, x: 800, y: 1000, season: 'spring' }); // 4 in spring
    expect(bot(m.state, g).dx).toBeLessThan(0);
  });
});

describe('planner', () => {
  it("goes for the next season's coin while it is cheap", () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'planner');
    const g = ghost(m, 1);
    Object.assign(g, { x: 1000, y: 1000 });
    m.state.coins.push({ id: 1, x: 800, y: 1000, season: 'spring' }); // in season: 4 now, 1 later
    m.state.coins.push({ id: 2, x: 1200, y: 1000, season: 'summer' }); // next: 2 now, 4 later
    expect(bot(m.state, g).dx).toBeGreaterThan(0);
  });

  it('holds its coins through the halving and secures right after it', () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'planner');
    const g = placeAtShrine(m, 1);
    g.carried.summer = 5;
    runTo(m, BEFORE_HALVING);
    expect(bot(m.state, g).action).toBeUndefined(); // the deadline does not send it home
    runTo(m, 75_000 + 50); // the halving: summer in season, 5 × 4
    expect(bot(m.state, g).action).toBe('secure');
  });

  it('secures before the match end in the last season', () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'planner');
    const g = placeAtShrine(m, 1);
    runTo(m, 230_000); // the last season, after its halving
    g.carried.winter = 2;
    expect(bot(m.state, g).action).toBeUndefined();
    runTo(m, 300_000 - cfg.secureDurationMs - cfg.bots.deadlineMarginMs);
    expect(bot(m.state, g).action).toBe('secure');
  });
});

describe('the walk home', () => {
  it('starts early enough to cross the field at carrying speed', () => {
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    const bot = createBot(cfg, 'banker');
    const g = ghost(m, 1);
    g.carried.winter = 1;
    g.x = cfg.fieldSize; // the far corner from team 0's shrine
    g.y = cfg.fieldSize;
    // A coin of its own just above it: until it turns home it goes for that coin.
    m.state.coins.push({ id: 999, x: cfg.fieldSize, y: cfg.fieldSize - 200, season: 'winter' });
    // The walk home is about 12 s; with the secure and the margin, about 17.6 s are needed.
    runTo(m, 55_000); // 20 s left: not yet
    expect(bot(m.state, g)).toEqual({ dx: 0, dy: -1 });
    runTo(m, 58_000); // 17 s left: on the way
    const step = bot(m.state, g);
    expect(step.dx).toBeLessThan(0);
    expect(step.dy).toBeLessThan(0);
  });
});
