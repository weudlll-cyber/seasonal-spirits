// Seasonal Spirits — the client draws ghosts and coins with the game core's sizes, so a coin is
// picked up exactly when the drawn shapes touch (owner's observation 2026-11-15); a label keeps
// clear of the rings drawn around a ghost, not only of its body (session 2026-11-16-LOOK-B).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, ghostRadius } from '@seasonal-spirits/game-core';
import { coinRadiusPx } from './field.js';
import { GHOST_SECURING } from '@seasonal-spirits/protocol';
import { ghostRadiusPx, ghostReach } from './ghosts.js';
import { fitField, type View } from './view.js';

// A desktop "Near" camera: about 0.63 px per field unit.
const NEAR: View = {
  ...fitField({ canvas: { width: 1280, height: 800 } } as CanvasRenderingContext2D, 104),
  scale: 0.63,
};

describe('drawn sizes', () => {
  it('draws a ghost with the game core radius, growing with its coins', () => {
    for (const carried of [0, 10, 60]) {
      const g = { id: 1, x: 0, y: 0, team: 0, carried, offSeason: 0, secured: 0, flags: 0 };
      expect(ghostRadiusPx(NEAR, g)).toBeCloseTo(ghostRadius(DEFAULT_CONFIG, carried) * 0.63);
    }
  });

  it('counts the outermost ring drawn around a ghost into the room its label keeps clear of', () => {
    expect(ghostReach(10, { id: 1, flags: 0 }, null)).toBe(10);
    expect(ghostReach(10, { id: 1, flags: 0 }, 1)).toBe(15.5); // own ring at +4, 3 px wide
    // Own and securing: the securing ring at +9, 2 px wide, is the outer one.
    expect(ghostReach(10, { id: 1, flags: GHOST_SECURING }, 1)).toBe(20);
  });

  it('draws a coin with the game core radius', () => {
    expect(coinRadiusPx(NEAR)).toBeCloseTo(DEFAULT_CONFIG.coinRadius * 0.63);
  });
});
