// Seasonal Sumo — the client draws characters with the game core's size (the collisions use it),
// and a label keeps clear of the hat and the rings drawn around one, not only of its body
// (session 2026-11-16-LOOK-B; Sky Island look 2026-11-18).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { GHOST_PROTECTED } from '@seasonal-spirits/protocol';
import { ghostRadiusPx, ghostReach, ghostSide } from './reach.js';
import { fitField, type View } from './view.js';

// A desktop camera: about 0.63 px per field unit.
const NEAR: View = {
  ...fitField({ canvas: { width: 1280, height: 800 } } as CanvasRenderingContext2D, 132),
  scale: 0.63,
};

describe('drawn sizes', () => {
  it('draws a ghost with the game core radius, at least 4 px', () => {
    expect(ghostRadiusPx(NEAR)).toBeCloseTo(DEFAULT_CONFIG.ghostRadius * 0.63);
    expect(ghostRadiusPx({ ...NEAR, scale: 0.01 })).toBe(4);
  });

  it('counts the hat and the rings into the room its label keeps clear of', () => {
    // The hat reaches 1.5 body radii up (character.ts REACH).
    expect(ghostReach(10, { flags: 0 })).toBe(15);
    // Protected: the protection ring at +9, 2 px wide.
    expect(ghostReach(10, { flags: GHOST_PROTECTED })).toBe(20);
  });

  // CI 2026-11-18: counting the hat on every side left a crowd's labels no room.
  it('keeps labels clear of the arms at the sides, not of the hat', () => {
    expect(ghostSide(10, { flags: 0 })).toBe(13);
    expect(ghostSide(10, { flags: GHOST_PROTECTED })).toBe(20);
  });
});
