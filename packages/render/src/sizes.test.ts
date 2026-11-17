// Seasonal Sumo — the client draws ghosts with the game core's size (the collisions use it), and
// a label keeps clear of the rings drawn around a ghost, not only of its body (session
// 2026-11-16-LOOK-B).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { GHOST_PROTECTED } from '@seasonal-spirits/protocol';
import { ghostRadiusPx, ghostReach } from './ghosts.js';
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

  it('counts the outermost ring drawn around a ghost into the room its label keeps clear of', () => {
    expect(ghostReach(10, { id: 1, flags: 0 }, null)).toBe(10);
    // Own: the arrow above its ring is the outermost mark — ring at +5, 4 px wide, a 6 px gap,
    // the arrow 12 px tall, 1 px for its edge (FIX 2026-11-17-3).
    expect(ghostReach(10, { id: 1, flags: 0 }, 1)).toBe(36);
    // Protected, not own: the protection ring at +9, 2 px wide; own and protected: the arrow.
    expect(ghostReach(10, { id: 1, flags: GHOST_PROTECTED }, null)).toBe(20);
    expect(ghostReach(10, { id: 1, flags: GHOST_PROTECTED }, 1)).toBe(36);
  });
});
