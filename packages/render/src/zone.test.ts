// Seasonal Sumo — King of the Season's zone on the island (2026-11-19): it carries a gold crown in
// its middle, its flags never hang past its ring, and no tree, pebble or lantern stands inside
// it, inside its next place, or where it can jump — tufts and flowers grow anywhere (owner
// 2026-11-19).

import { configFrom, DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { FLOWERS, LANTERNS, PEBBLES, TREES, drawDecor, freeOf, spotOn } from './decor.js';
import { onScreen } from './island.js';
import { useShape } from './shape.js';
import { fitBox, sx, sy } from './view.js';
import { drawZoneMarks, zoneKeepOut } from './zone.js';

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
    drawZoneMarks(v, { x: C - 300, y: C - 300, r: 200 }, '#3fa34d');
    expect(fills).toContain('#FFC23C');
  });

  it('hangs no flag past its ring: a zone fitting the walls keeps its flags inside the fence', () => {
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
    drawZoneMarks(v, z, '#3fa34d');
    xs.push(...r.closed.map((p) => p.x)); // where each flag's path began: its left corner
    expect(Math.max(...ys)).toBeLessThanOrEqual(sy(v, z.y + z.r) + 1e-9);
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
    drawDecor(r.ctx, { ...ground, keepOut: everywhere }, 0);
    expect(r.arcs).toHaveLength(FLOWERS.length); // and no tree crown: the trees keep out
  });
});
