// Seasonal Sumo — depth on the island (2026-11-19): a tree in front of a character is drawn over
// it, a tree behind it is not; two "Dodged!" bubbles never stand over each other.

import type { GhostState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { TREES, crownOf, spotOn } from './decor.js';
import { drawDecorInFront } from './decor-front.js';
import { onScreen } from './island.js';
import { DODGED_BOX, clearBubble } from './jump.js';
import { Seasons } from './season.js';
import { fitBox, type View } from './view.js';

const ghostAt = (v: View, x: number, y: number): GhostState =>
  ({ id: 1, x: (x - v.ox) / v.scale, y: (y - v.oy) / (v.scale * v.tilt), flags: 0 }) as GhostState;

describe('depth on the island', () => {
  const r = recorder();
  const v = fitBox(r.ctx, 100, { x: 1000, y: 1000, half: 416 });
  const ground = onScreen(v, { x: 1000, y: 1000, r: 400, square: false });
  const tree = TREES[0];
  const [x, y] = spotOn(ground, tree);
  const crown = crownOf(ground, 0, 0);
  const crownsDrawn = (g: GhostState): number => {
    const rec = recorder();
    drawDecorInFront({ ...v, ctx: rec.ctx }, ground, [g], { nowMs: 0, seasons: new Seasons() });
    return rec.arcs.filter((a) => Math.abs(a.x - crown.x) < 3 && Math.abs(a.y - crown.y) < 3)
      .length;
  };

  it('draws a tree again over a character standing behind it', () => {
    expect(crownsDrawn(ghostAt(v, x, y - 6))).toBeGreaterThan(0);
  });

  it('leaves a character standing in front of a tree over it', () => {
    expect(crownsDrawn(ghostAt(v, x, y + 12))).toBe(0);
  });
});

describe('"Dodged!" bubbles', () => {
  it('moves a bubble up out of another one, and leaves it out when there is no room', () => {
    const first = { x: 100, y: 200 };
    expect(clearBubble(first, [])).toEqual(first);
    const second = clearBubble({ x: 120, y: 205 }, [first]);
    expect(second && Math.abs(second.y - first.y)).toBeGreaterThanOrEqual(DODGED_BOX.height);
    const stack = [0, 1, 2, 3].map((k) => ({ x: 100, y: 200 - k * DODGED_BOX.height }));
    expect(clearBubble({ x: 100, y: 200 }, stack)).toBeNull();
  });
});
