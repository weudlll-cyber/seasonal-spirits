// Seasonal Sumo — the halving's banner in King and Bomb says when the walls close in, only then.

import { DEFAULT_SETTINGS, GAME_MODES, configFrom } from '@seasonal-spirits/game-core';
import { describe, expect, it } from 'vitest';
import { halvingBanner } from './modes.js';

const HILL = GAME_MODES.indexOf('hill');
const BOMB = GAME_MODES.indexOf('bomb');
const hill = configFrom(DEFAULT_SETTINGS, 'hill');
const at = (mode: number, wall: number) => ({ mode, season: 3, wall });

describe("the halving's banner", () => {
  it('says the walls close in, in King and Bomb, when they do', () => {
    const on = { ...DEFAULT_SETTINGS, hillClose: 1, bombClose: 1 };
    expect(halvingBanner(at(HILL, hill.wallHalf), on)).toBe(
      'the zone halves and the walls close in · Winter is in season',
    );
    expect(halvingBanner(at(BOMB, 700), on)).toBe('the bomb goes off and the walls close in');
  });

  it('reads as before with the switch off or the walls already at their smallest', () => {
    const off = { ...DEFAULT_SETTINGS, hillClose: 0 };
    expect(halvingBanner(at(HILL, hill.wallHalf), off)).toBe(
      'the zone halves · Winter is in season',
    );
    const smallest = { ...DEFAULT_SETTINGS, hillClose: 1 };
    expect(halvingBanner(at(HILL, hill.walls.smallest), smallest)).toBe(
      'the zone halves · Winter is in season',
    );
    expect(halvingBanner(at(0, 0), null)).toBe('the arena halves · Winter is in season');
  });
});
