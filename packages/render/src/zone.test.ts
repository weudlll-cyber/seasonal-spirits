// Seasonal Sumo — King of the Season's zone on the island (2026-11-19): it carries a gold crown in
// its middle, and no decoration stands inside it, inside its next place, or where it can jump.

import { configFrom, DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { FLOWERS, PEBBLES, TREES, freeOf, spotOn } from './decor.js';
import { onScreen } from './island.js';
import { useShape } from './shape.js';
import { fitBox } from './view.js';
import { drawZone, zoneKeepOut } from './zone.js';

const hill = configFrom(DEFAULT_SETTINGS, 'hill');
const C = hill.fieldSize / 2;
const box = { x: C, y: C, half: hill.wallHalf };

afterEach(() => {
  useShape(configFrom(DEFAULT_SETTINGS, 'sumo'));
});

describe("King of the Season's zone", () => {
  it('stands a gold crown in its middle', () => {
    const r = recorder();
    const v = fitBox(r.ctx, 100, box);
    const fills: unknown[] = [];
    const ctx = r.ctx;
    const fill = (): void => {
      fills.push(ctx.fillStyle);
    };
    Object.assign(ctx, { fill });
    drawZone(v, { x: C - 300, y: C - 300, r: 200 }, '#3fa34d', 0);
    expect(fills).toContain('#FFC23C');
  });

  it('keeps every decoration off the zone, its next place and the four places it can jump to', () => {
    useShape(hill);
    const r = recorder();
    const v = fitBox(r.ctx, 100, box);
    const zone = { x: C - 300, y: C - 300, r: 120 };
    const state = { mode: 1, area: zone, next: null } as unknown as ServerState;
    const keepOut = zoneKeepOut(v, box, state);
    const ground = {
      ...onScreen(v, { x: C, y: C, r: hill.wallHalf * 1.05, square: true }),
      keepOut,
    };
    const quarters = [-1, 1].flatMap((dx) => [-1, 1].map((dy) => ({ dx, dy })));
    const places: readonly (readonly [number, number, ...unknown[]])[] = [
      ...TREES,
      ...PEBBLES,
      ...FLOWERS,
    ];
    for (const { p } of freeOf(ground, places)) {
      const [x, y] = spotOn(ground, p);
      const fx = (x - v.ox) / v.scale;
      const fy = (y - v.oy) / (v.scale * v.tilt);
      for (const { dx, dy } of quarters) {
        const q = { x: C + (dx * box.half) / 2, y: C + (dy * box.half) / 2 };
        expect(Math.hypot(fx - q.x, fy - q.y)).toBeGreaterThan(hill.hill.zoneRadius);
      }
    }
    expect(freeOf(ground, TREES).length).toBeLessThan(TREES.length);
  });
});
