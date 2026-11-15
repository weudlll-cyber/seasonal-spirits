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
    const a = edgeArrow(SCREEN, { x: -1000, y: -600 }, 30, [minimap]);
    expect(a?.y).toBe(320);
  });

  // A phone: 412 × 839 with the bar down to 104, the action button bottom right and the
  // joystick's thumb zone bottom left (scene.ts thumbZones).
  const PHONE = { left: 0, top: 104, right: 412, bottom: 839 };
  const ACTION = { left: 300, top: 727, right: 412, bottom: 839 };
  const STICK = { left: 0, top: 579, right: 206, bottom: 839 };
  const clear = (p: { x: number; y: number }, r: typeof ACTION): boolean =>
    p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom;

  it('keeps out of the action button’s thumb zone and still points at the shrine', () => {
    const target = { x: 900, y: 1300 };
    const a = edgeArrow(PHONE, target, 34, [STICK, ACTION]);
    expect(a).not.toBeNull();
    if (!a) return;
    expect(clear(a, ACTION)).toBe(true);
    expect(a.x).toBeGreaterThanOrEqual(34);
    expect(a.y).toBeLessThanOrEqual(839 - 34);
    expect(a.angle).toBeCloseTo(Math.atan2(target.y - a.y, target.x - a.x));
  });

  it('keeps out of the joystick’s thumb zone', () => {
    const a = edgeArrow(PHONE, { x: -500, y: 1400 }, 34, [STICK, ACTION]);
    expect(a && clear(a, STICK)).toBe(true);
  });
});
