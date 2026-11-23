// Seasonal Sumo — King's zone on the island: a crown over its middle, flags inward within its ring
// and above a hat, no tree, pebble or lantern in it, its next place or where it can jump.

import { configFrom, DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { REACH } from './character.js';
import { FLOWERS, LANTERNS, PEBBLES, TREES, drawGroundDecor, freeOf, spotOn } from './decor.js';
import { onScreen } from './island.js';
import { useShape } from './shape.js';
import { ghostRadiusPx } from './reach.js';
import { fitBox, sx } from './view.js';
import { drawZoneCrown, zoneKeepOut, zonePoles } from './zone.js';

const hill = configFrom(DEFAULT_SETTINGS, 'hill');
const C = hill.fieldSize / 2;
const box = { x: C, y: C, half: hill.wallHalf };

afterEach(() => {
  useShape(configFrom(DEFAULT_SETTINGS, 'sumo'));
});

describe("King of the Season's zone", () => {
  it('floats a gold crown over its middle', () => {
    const r = recorder();
    const v = fitBox(r.ctx, 100, box);
    const fills: unknown[] = [];
    const ctx = r.ctx;
    const fill = (): void => {
      fills.push(ctx.fillStyle);
    };
    Object.assign(ctx, { fill });
    drawZoneCrown(v, { x: C - 300, y: C - 300, r: 200 });
    expect(fills).toContain('#FFC23C');
  });

  it('flies no flag past its ring, every flag above the hat of a character on the ring', () => {
    const r = recorder();
    const v = fitBox(r.ctx, 100, box);
    const xs: number[] = [];
    const ys: number[] = [];
    const lineTo = (x: number, y: number): void => {
      xs.push(x);
      ys.push(y);
    };
    Object.assign(r.ctx, { lineTo });
    const z = { x: C + box.half / 2, y: C + box.half / 2, r: box.half / 2 }; // touches two walls
    const hat = ghostRadiusPx(v) * REACH.top; // a hat's top over the foot of one on the ring
    for (const pole of zonePoles(v, z, '#3fa34d')) {
      ys.length = 0;
      pole.draw();
      expect(Math.max(...ys)).toBeLessThan(pole.y - hat); // the flag's lowest corner
    }
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(sx(v, z.x + z.r) + 1e-9);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(sx(v, z.x - z.r) - 1e-9);
  });
});

describe("the island's decoration round King's zones", () => {
  it('keeps trees, pebbles and lanterns off the zone, its next place and where it can jump', () => {
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
      ...LANTERNS,
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

  it('lets every flower grow, inside the zones too', () => {
    const r = recorder();
    const v = fitBox(r.ctx, 100, box);
    const ground = onScreen(v, { x: C, y: C, r: hill.wallHalf * 1.05, square: true });
    const everywhere = [{ x: ground.cx, y: ground.cy, rx: 1e6, ry: 1e6 }];
    drawGroundDecor(r.ctx, { ...ground, keepOut: everywhere }, 0);
    expect(r.arcs).toHaveLength(FLOWERS.length); // and no tree crown: the trees keep out
  });
});
