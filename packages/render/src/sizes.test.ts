// Seasonal Sumo — the client draws characters with the game core's size (the collisions use it),
// and a label keeps clear of the hat and the rings drawn around one, not only of its body
// (session 2026-11-16-LOOK-B; Sky Island look 2026-11-18).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { GHOST_PROTECTED } from '@seasonal-spirits/protocol';
import { ghostRadiusPx, ghostReach } from './reach.js';
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

  it('counts the hat, the rings and the own triangle into the room its label keeps clear of', () => {
    // The hat reaches 1.5 body radii up (character.ts REACH).
    expect(ghostReach(10, { id: 1, flags: 0 }, null)).toBe(15);
    // Own: the triangle above the hat — a 6 px gap, 12 px tall, 1 px for its edge.
    expect(ghostReach(10, { id: 1, flags: 0 }, 1)).toBe(34);
    // Protected, not own: the protection ring at +9, 2 px wide; own and protected: the triangle
    // above that ring.
    expect(ghostReach(10, { id: 1, flags: GHOST_PROTECTED }, null)).toBe(20);
    expect(ghostReach(10, { id: 1, flags: GHOST_PROTECTED }, 1)).toBe(39);
  });
});
