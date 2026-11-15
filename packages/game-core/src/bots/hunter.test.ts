// Seasonal Spirits — the stuck-bot bug of 2026-11-15: hunters robbing each other in a pack.
// Protects the hunter's "only from someone richer" rule and that no bot stands still.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config.js';
import { simulate, SIM_TICK_MS } from '../simulation.js';
import { createBot } from './strategies.js';
import { ghost, matchOf, quietConfig } from '../test-helpers.js';

describe('hunter bots', () => {
  it('do not rob a hunter that carries no more than they do', () => {
    const cfg = quietConfig();
    const m = matchOf(cfg, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    const bot = createBot(cfg, 'hunter');
    const [a, b] = [ghost(m, 1), ghost(m, 2)];
    Object.assign(a, { x: 1000, y: 1000 });
    Object.assign(b, { x: 1010, y: 1000 });
    a.carried.spring = 1;
    b.carried.spring = 1;
    expect(bot(m.state, a).action).toBeUndefined();
    b.carried.spring = 2;
    expect(bot(m.state, a).action).toBe('steal');
  });

  it('let no bot stand still longer than 3 s in a seeded match, except while securing', () => {
    const last = new Map<number, { x: number; y: number; stillMs: number }>();
    let longest = 0;
    simulate(DEFAULT_CONFIG, 1, undefined, (s) => {
      for (const g of s.ghosts) {
        const p = last.get(g.id);
        const still = p !== undefined && p.x === g.x && p.y === g.y && g.securingUntilMs === null;
        const stillMs = still ? p.stillMs + SIM_TICK_MS : 0;
        longest = Math.max(longest, stillMs);
        last.set(g.id, { x: g.x, y: g.y, stillMs });
      }
    });
    expect(longest).toBeLessThanOrEqual(3000);
  });
});
