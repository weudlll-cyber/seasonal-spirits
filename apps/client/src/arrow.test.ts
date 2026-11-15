// Seasonal Spirits — the "Your shrine" arrow: hidden while the shrine is on screen, otherwise at
// the edge in the shrine's direction, never on top of the minimap.

import { describe, expect, it } from 'vitest';
import { edgeArrow } from './arrow.js';

const SCREEN = { left: 0, top: 100, right: 800, bottom: 700 };

describe('shrine arrow', () => {
  it('is not drawn while the shrine is on screen', () => {
    expect(edgeArrow(SCREEN, { x: 400, y: 400 }, 30)).toBeNull();
  });

  it('sits at the edge on the line towards a shrine off screen and points at it', () => {
    const right = edgeArrow(SCREEN, { x: 2000, y: 400 }, 30);
    expect(right).toMatchObject({ x: 770, y: 400, angle: 0 });
    const corner = edgeArrow(SCREEN, { x: -1000, y: -1000 }, 30);
    expect(corner?.x).toBeGreaterThanOrEqual(30);
    expect(corner?.y).toBeGreaterThanOrEqual(130);
    expect(corner?.angle).toBeCloseTo(Math.atan2(-1400, -1400));
  });

  it('moves below the minimap instead of hiding under it', () => {
    const minimap = { left: 10, top: 110, right: 190, bottom: 290 };
    const a = edgeArrow(SCREEN, { x: -1000, y: -600 }, 30, minimap);
    expect(a?.y).toBe(320);
  });
});
