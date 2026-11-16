// Seasonal Sumo — what the human stand-in perceives: the view kept inside the field like the
// camera, only the ghosts in it (and the own ghost), the state a reaction time ago.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config.js';
import { ghost, matchOf } from '../test-helpers.js';
import { perceive, viewRect } from './perception.js';

const FIELD = DEFAULT_CONFIG.fieldSize;

describe('stand-in perception', () => {
  it('keeps the view inside the field like the camera, and a view wider than it shows all', () => {
    expect(viewRect(FIELD, { x: 100, y: 1000 }, { x: 550, y: 550 })).toEqual({
      left: 0,
      right: 1100,
      top: 450,
      bottom: 1550,
    });
    expect(viewRect(FIELD, { x: 100, y: 1990 }, { x: 1000, y: 550 })).toMatchObject({
      left: 0,
      right: 2000,
      bottom: 2000,
    });
  });

  it('shows only the ghosts in view, and always the own ghost', () => {
    const m = matchOf(DEFAULT_CONFIG, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
      { id: 3, team: 2 },
    ]);
    Object.assign(ghost(m, 1), { x: 1000, y: 1000 });
    Object.assign(ghost(m, 2), { x: 1900, y: 1000 });
    Object.assign(ghost(m, 3), { x: 1200, y: 1000 });
    const seen = perceive(FIELD, m.state, 1, { view: { x: 550, y: 550 }, reactionMs: 0 });
    expect(seen?.me.id).toBe(1);
    expect(seen?.state.ghosts.map((g) => g.id)).toEqual([1, 3]);
  });

  it('shows the state as it was a reaction time ago', () => {
    const m = matchOf(DEFAULT_CONFIG, [{ id: 1, team: 0 }]);
    const sight = { view: null, reactionMs: 300 };
    // Look every tick, as a bot does, while the match runs a second.
    while (m.state.elapsedMs < 1000) {
      m.tick(50, new Map());
      perceive(FIELD, m.state, 1, sight);
    }
    expect(perceive(FIELD, m.state, 1, sight)?.state.elapsedMs).toBe(700);
    expect(perceive(FIELD, m.state, 1, { view: null, reactionMs: 0 })?.state).toBe(m.state);
  });
});
