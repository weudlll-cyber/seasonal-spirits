// Seasonal Sumo — the human-like bot layer: it acts on what it saw a reaction time ago, its aim
// stays within the noise band, its form within its band, and the same seed gives the same
// behaviour.

import { describe, expect, it } from 'vitest';
import { simulate } from '../simulation.js';
import { cfg, ghost, matchOf, place } from '../test-helpers.js';
import type { Intent } from '../types.js';
import { botIntent } from './bot.js';
import { createBot, type Mind } from './human.js';

const steady = {
  ...cfg,
  bots: { ...cfg.bots, hesitateChance: 0, earlyDashChance: 0, dashChance: 1 },
};

const angleOf = (i: Intent): number => Math.atan2(i.dy, i.dx);

describe('human-like bot', () => {
  it('acts on what it saw a reaction time ago, not on the newest state', () => {
    const m = matchOf(steady, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    const minds: Mind[] = [];
    const bot = createBot(steady, 7, (x) => minds.push(x));
    place(m, 1, 0, 0);
    place(m, 2, 400, 0); // to the right
    // Look every tick for a second, as the server asks.
    while (m.state.elapsedMs < 1000) {
      m.tick(50, new Map());
      bot(m.state, ghost(m, 1));
    }
    place(m, 2, -400, 0); // jumps to the left
    m.tick(50, new Map());
    const right = bot(m.state, ghost(m, 1));
    expect(right.dx).toBeGreaterThan(0); // it has not seen the jump yet
    const reaction = minds[0]?.reactionMs ?? 0;
    expect(reaction).toBeGreaterThanOrEqual(cfg.bots.reactionMs[0]);
    expect(reaction).toBeLessThanOrEqual(cfg.bots.reactionMs[1]);
    while (m.state.elapsedMs < 1050 + reaction + cfg.bots.reactionJitterMs + 50) {
      m.tick(50, new Map());
      bot(m.state, ghost(m, 1));
    }
    expect(bot(m.state, ghost(m, 1)).dx).toBeLessThan(0); // now it has
  });
});

describe('human-like bot: noise, form and seed', () => {
  it('aims within the noise band around what its brain decided', () => {
    const m = matchOf(steady, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
    ]);
    place(m, 1, 0, 0);
    place(m, 2, 500, 300);
    const brain = angleOf(botIntent(steady, m.state, ghost(m, 1)));
    const worst = (cfg.bots.aimNoiseDeg * Math.PI) / 180 / cfg.bots.form[0];
    let spread = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const bot = createBot(
        { ...steady, bots: { ...steady.bots, reactionMs: [0, 0], reactionJitterMs: 0 } },
        seed,
      );
      const off = Math.abs(angleOf(bot(m.state, ghost(m, 1))) - brain);
      expect(off).toBeLessThanOrEqual(worst + 1e-9);
      spread = Math.max(spread, off);
    }
    expect(spread).toBeGreaterThan(worst / 4); // there is noise at all
  });

  it('drifts its form slowly and never out of its band', () => {
    const forms: number[] = [];
    const bot = createBot(cfg, 3, (x) => forms.push(x.form));
    const m = matchOf(cfg, [{ id: 1, team: 0 }]);
    while (!m.state.ended) {
      m.tick(50, new Map());
      bot(m.state, ghost(m, 1));
    }
    expect(Math.min(...forms)).toBeGreaterThanOrEqual(cfg.bots.form[0]);
    expect(Math.max(...forms)).toBeLessThanOrEqual(cfg.bots.form[1]);
    expect(new Set(forms).size).toBeGreaterThan(5);
  });

  it('plays the same match again from the same seed', () => {
    const roster = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
      id,
      team: ((id - 1) % 4) as 0 | 1 | 2 | 3,
    }));
    expect(simulate(cfg, 11, roster).result).toEqual(simulate(cfg, 11, roster).result);
  });
});
