// Seasonal Sumo — what a human-like bot perceives: every ghost on the playing area, as a
// player's screen shows it, and the state a reaction time ago.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config.js';
import { ghost, matchOf } from '../test-helpers.js';
import { perceive } from './perception.js';

describe('bot perception', () => {
  it('sees every ghost on the field, near and far, like the whole arena on a screen', () => {
    const m = matchOf(DEFAULT_CONFIG, [
      { id: 1, team: 0 },
      { id: 2, team: 1 },
      { id: 3, team: 2 },
    ]);
    Object.assign(ghost(m, 1), { x: 200, y: 1000 });
    Object.assign(ghost(m, 2), { x: 1800, y: 1000 });
    Object.assign(ghost(m, 3), { x: 1000, y: 1850 });
    const seen = perceive(m.state, 1, 0);
    expect(seen?.me.id).toBe(1);
    expect(seen?.state.ghosts.map((g) => g.id)).toEqual([1, 2, 3]);
  });

  it('shows the state as it was a reaction time ago', () => {
    const m = matchOf(DEFAULT_CONFIG, [{ id: 1, team: 0 }]);
    // Look every tick, as a bot does, while the match runs a second.
    while (m.state.elapsedMs < 1000) {
      m.tick(50, new Map());
      perceive(m.state, 1, 300);
    }
    expect(perceive(m.state, 1, 300)?.state.elapsedMs).toBe(700);
    expect(perceive(m.state, 1, 0)?.state).toBe(m.state);
  });
});
