// Seasonal Spirits — the instruments of the human round (session 2026-11-16-HUMAN): the
// stand-in goes for the nearest coin it can see and secures before a deadline; the coin
// observer times pickups; the shrine observer finds groups
// of more than four and how long they last; every pickup is an event.

import { describe, expect, it } from 'vitest';
import { act, ghost, matchOf, placeAtShrine, quietConfig, runTo } from '../test-helpers.js';
import type { MatchEvent, MatchState } from '../types.js';
import { CoinLives } from './coins.js';
import { ShrineGroups } from './groups.js';
import { DESKTOP_VIEW, createStandIn } from './standin.js';

describe('human stand-in', () => {
  it('heads for the nearest coin in its view, not a nearer one outside it', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    Object.assign(ghost(m, 1), { x: 1000, y: 300 });
    m.state.coins.push(
      { id: 1, x: 1000, y: 900, season: 'spring' }, // 600 below: outside a 550 half-height view
      { id: 2, x: 1500, y: 300, season: 'spring' }, // 500 to the right: inside
    );
    const bot = createStandIn(cfg, { view: DESKTOP_VIEW, reactionMs: 0 });
    expect(bot(m.state, ghost(m, 1))).toMatchObject({ dx: 1, dy: 0 });
  });

  it('secures at its shrine when the deadline comes near', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    runTo(m, cfg.seasonDurationMs - 3000);
    const g = placeAtShrine(m, 1);
    g.carried.spring = 3;
    const bot = createStandIn(cfg, { view: null, reactionMs: 0 });
    expect(bot(m.state, g)).toMatchObject({ action: 'secure' });
  });
});

describe('human round observers', () => {
  it('times each pickup from the spawn and keeps a coin across a halving', () => {
    const lives = new CoinLives();
    const state = (ms: number, coins: number[], events: MatchEvent[]): MatchState =>
      ({
        elapsedMs: ms,
        ghosts: [{ x: 0, y: 0 }],
        coins: coins.map((id) => ({ id, x: 300, y: 400 })),
        events,
      }) as unknown as MatchState;
    lives.observe(state(100, [1, 2], []));
    lives.observe(state(1600, [2], [{ type: 'pickup', ghost: 3, coin: 1 }]));
    const halving: MatchEvent = {
      type: 'halving',
      atMs: 2000,
      season: 'summer',
      carried: 0,
    };
    lives.observe(state(2000, [2, 9], [halving]));
    lives.observe(state(2500, [9], [{ type: 'pickup', ghost: 3, coin: 2 }]));
    expect(lives.pickedAfterMs).toEqual([1500, 2400]);
    expect(lives.spawned).toBe(3);
    expect(lives.nearestAtSpawn[0]).toBe(500);
  });

  it('finds a group of more than four at a shrine and how long it lasted', () => {
    const cfg = quietConfig();
    const m = matchOf(
      cfg,
      [0, 1, 2, 3, 4, 5].map((i) => ({ id: i + 1, team: 0 as const })),
    );
    const groups = new ShrineGroups(cfg, new Map());
    for (const id of [1, 2, 3, 4, 5]) placeAtShrine(m, id);
    Object.assign(ghost(m, 6), { x: 1000, y: 1000 }); // the sixth stays away
    for (let t = 0; t < 20; t++) {
      m.tick(50, new Map());
      groups.observe(m.state);
    }
    for (const id of [1, 2]) Object.assign(ghost(m, id), { x: 1000, y: 1000 });
    groups.observe(m.state);
    expect(groups.groups).toHaveLength(1);
    expect(groups.groups[0]).toMatchObject({ shrineTeam: 0, peak: 5, ownTeam: 5 });
    expect(groups.groups[0]?.ms).toBeGreaterThanOrEqual(950);
  });

  it('reports every pickup as an event with the ghost and the coin', () => {
    const m = matchOf(quietConfig(), [{ id: 1, team: 0 }]);
    const g = ghost(m, 1);
    m.state.coins.push({ id: 7, x: g.x, y: g.y, season: 'spring' });
    act(m, 1, { dx: 0, dy: 0 });
    expect(m.state.events).toContainEqual({ type: 'pickup', ghost: 1, coin: 7 });
  });
});
