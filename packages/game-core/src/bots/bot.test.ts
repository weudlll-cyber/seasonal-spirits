// Seasonal Sumo — the bot: back inward near the edge, towards the nearest opponent it can push,
// a dash when lined up close and not near the edge, nothing while it is out.

import { describe, expect, it } from 'vitest';
import { botIntent, edgeMargin } from './bot.js';
import { cfg, ghost, matchOf, place } from '../test-helpers.js';

const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];

describe('bot', () => {
  it('turns back inward near the edge', () => {
    const m = matchOf(cfg, two);
    place(m, 1, cfg.arenaRadius - edgeMargin(cfg, cfg.arenaRadius) / 2, 0);
    place(m, 2, cfg.arenaRadius - 20, 0); // an opponent further out does not tempt it
    const step = botIntent(cfg, m.state, ghost(m, 1));
    expect(step.dx).toBeLessThan(-0.9);
    expect(step.action).toBeUndefined();
  });

  it('dashes at an opponent lined up close', () => {
    const m = matchOf(cfg, two);
    place(m, 1, 0, 0);
    place(m, 2, cfg.bots.dashRange / 2, 0);
    expect(botIntent(cfg, m.state, ghost(m, 1))).toMatchObject({ action: 'dash' });
  });

  it('waits for its cooldown, and leaves a protected opponent alone', () => {
    const m = matchOf(cfg, two);
    place(m, 1, 0, 0);
    place(m, 2, cfg.bots.dashRange / 2, 0);
    ghost(m, 1).dashReadyMs = 5000;
    expect(botIntent(cfg, m.state, ghost(m, 1)).action).toBeUndefined();
    ghost(m, 1).dashReadyMs = 0;
    ghost(m, 2).protectedUntilMs = 5000;
    expect(botIntent(cfg, m.state, ghost(m, 1)).action).toBeUndefined();
  });

  it('does nothing while it is out', () => {
    const m = matchOf(cfg, two);
    ghost(m, 1).phase = 'out';
    expect(botIntent(cfg, m.state, ghost(m, 1))).toEqual({ dx: 0, dy: 0 });
  });
});
