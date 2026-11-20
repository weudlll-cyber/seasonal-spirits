// Seasonal Sumo review capture — the own marker's moments: the first seconds, then in each season
// the mode's densest moment once (a crowd, a full zone, carrying a bomb in a crowd), the season's
// last seconds when none came, and the end once every season is shot or the match is over.

import { GHOST_BOMB } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import type { ClientView } from '../../../apps/client/e2e/stack.js';
import { OwnDirector } from './own-moments.js';

// The own ghost 1 at the middle with `crowd` others close round it (body radius 10 px).
const frame = (v: Partial<ClientView>, crowd = 0): ClientView =>
  ({
    ghost: 1,
    own: { x: 0, y: 0, flags: 0, dashLeftMs: 0 },
    gameMode: 'sumo',
    area: null,
    season: 0,
    countdown: null,
    result: false,
    ghostsShown: [
      { id: 1, x: 100, y: 100, r: 10, bot: false, score: 0 },
      ...Array.from({ length: crowd }, (_, i) => ({
        id: 2 + i,
        x: 120 + i,
        y: 100,
        r: 10,
        bot: true,
        score: 0,
      })),
    ],
    ...v,
  }) as ClientView;

describe("the own marker's moments", () => {
  it('shoots the first seconds, then a crowd once in a season', () => {
    const d = new OwnDirector();
    expect(d.observe(frame({}, 6), 0)).toBeNull();
    expect(d.observe(frame({}, 6), 1500)).toBe('first-seconds');
    expect(d.observe(frame({}, 2), 1600)).toBeNull(); // no crowd yet
    expect(d.observe(frame({}, 6), 1700)).toBe('season-1-crowd');
    expect(d.observe(frame({}, 6), 1800)).toBeNull();
    expect(d.observe(frame({ season: 1 }, 6), 1900)).toBe('season-2-crowd');
  });

  it('wants a full zone in King and a carried bomb in Bomb, not a crowd alone', () => {
    const hill = new OwnDirector();
    const zone = { x: 0, y: 0, r: 100 };
    hill.observe(frame({ gameMode: 'hill' }), 0);
    hill.observe(frame({ gameMode: 'hill' }), 1500);
    expect(
      hill.observe(frame({ gameMode: 'hill', area: { ...zone, x: 900 } }, 6), 1600),
    ).toBeNull();
    expect(hill.observe(frame({ gameMode: 'hill', area: zone }, 6), 1700)).toBe(
      'season-1-full-zone',
    );
    const bomb = new OwnDirector();
    bomb.observe(frame({ gameMode: 'bomb' }), 0);
    bomb.observe(frame({ gameMode: 'bomb' }), 1500);
    expect(bomb.observe(frame({ gameMode: 'bomb' }, 6), 1600)).toBeNull();
    const carrying = { own: { x: 0, y: 0, flags: GHOST_BOMB, dashLeftMs: 0 } };
    expect(bomb.observe(frame({ gameMode: 'bomb', ...carrying }, 6), 1700)).toBe(
      'season-1-carrying-bomb-crowd',
    );
  });

  it("shoots a season's last seconds when no crowd came, and ends after the fourth", () => {
    const d = new OwnDirector();
    d.observe(frame({}), 0);
    d.observe(frame({}), 1500);
    for (const season of [0, 1, 2, 3]) {
      const late = frame({ season, countdown: { ms: 2000, toEnd: season === 3 } });
      expect(d.observe(late, 2000 + season)).toBe(`season-${String(season + 1)}-late`);
    }
    expect(d.finished).toBe(true);
  });

  it('ends at the result', () => {
    const d = new OwnDirector();
    d.observe(frame({}), 0);
    d.observe(frame({ result: true }), 100);
    expect(d.finished).toBe(true);
  });
});
