// Seasonal Sumo — the follow camera's minimap: ink-outlined marks on every ground, its edge where
// game-core stops a character and shrinking at King's halvings, in Bomb only the carriers.

import { fieldBounds, wallsAfter } from '@seasonal-spirits/game-core';
import { GHOST_BOMB, type GhostState, type ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { MINIMAP_PX, drawMinimap, minimapMarks } from './minimap.js';
import { clientConfig, liveConfig } from './modes.js';
import { look } from './palette.js';
import type { View } from './view.js';

const HILL = 1;
const BOMB = 2;
const AT = { right: 400, top: 100 };
const ghost = (id: number, x: number, y: number, flags = 0): GhostState =>
  ({ id, x, y, team: id & 3, flags }) as GhostState;
const state = (mode: number, wall: number, ghosts: GhostState[], area = null as unknown) =>
  ({ mode, wall, season: 0, area, ghosts }) as unknown as ServerState;
// A view of the field's middle, as the follow camera gives one on a phone.
const view = (ctx = recorder(390, 844).ctx): View => ({
  ctx,
  scale: 0.6,
  tilt: 0.8,
  ox: 195 - 1000 * 0.6,
  oy: 470 - 1000 * 0.6 * 0.8,
  top: 104,
});

describe('the minimap', () => {
  it('outlines the zone, every bomb carrier and the own dot in ink', () => {
    const r = recorder();
    const inked: number[] = [];
    const stroke = (): void => {
      if (r.ctx.strokeStyle === look().ink) inked.push(r.arcs.length);
    };
    Object.assign(r.ctx, { stroke });
    const own = ghost(1, 900, 900);
    const ghosts = [own, ghost(2, 1100, 900, GHOST_BOMB), ghost(3, 1000, 1100, GHOST_BOMB)];
    const s = state(HILL, 450, ghosts, { x: 800, y: 800, r: 150 });
    drawMinimap(r.ctx, AT, s, { view: view(r.ctx), own, tuning: null });
    // The zone, each carrier's ring and bomb dot, the own dot's halo and the dot; each stroked in
    // ink once drawn.
    expect(r.arcs).toHaveLength(7);
    expect(inked).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7]));
  });

  it('shows the bomb carriers in Bomb and no other player', () => {
    const own = ghost(1, 1000, 1000);
    const carriers = [ghost(2, 600, 700, GHOST_BOMB), ghost(3, 1300, 1200, GHOST_BOMB)];
    const others = [ghost(4, 500, 1400), ghost(5, 1400, 500), ghost(6, 900, 1300)];
    const s = state(BOMB, 700, [own, ...carriers, ...others]);
    const m = minimapMarks(AT, s, { view: view(), own, tuning: null });
    expect(m.carriers).toHaveLength(2);
    expect(m.zone).toBeNull();
    const r = recorder();
    drawMinimap(r.ctx, AT, s, { view: view(r.ctx), own, tuning: null });
    // Only the carriers (ring and dot each) and the own dot are circles on the map.
    const at = (p: { x: number; y: number }): string => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
    const drawn = new Set(r.arcs.map(at));
    expect(drawn).toEqual(new Set([...m.carriers.map(at), at(m.own ?? { x: 0, y: 0 })]));
  });
});

describe("the minimap's edge", () => {
  it("draws the edge where game-core stops a character: its bounds and a body's radius", () => {
    for (const s of [state(BOMB, 700, []), state(HILL, 450, [])]) {
      const cfg = liveConfig(s);
      const b = fieldBounds(cfg);
      const m = minimapMarks(AT, s, { view: view(), own: undefined, tuning: null });
      const k = (MINIMAP_PX - 14) / (2 * clientConfig(s.mode).wallHalf);
      expect(m.edge.right - m.edge.left).toBeCloseTo((b.hi - b.lo + 2 * cfg.ghostRadius) * k, 6);
      // Centred on the panel: at the start the walls are the map's square.
      expect((m.edge.left + m.edge.right) / 2).toBeCloseTo(AT.right - MINIMAP_PX / 2, 6);
    }
  });

  it("closes the walls in on the map at each King halving, the panel's scale kept", () => {
    const cfg = clientConfig(HILL);
    let wall = cfg.wallHalf;
    const first = minimapMarks(AT, state(HILL, wall, []), {
      view: view(),
      own: undefined,
      tuning: null,
    });
    const side = (r: { left: number; right: number }): number => r.right - r.left;
    let shown = side(first.edge);
    // Every halving of a match (3 by default); the walls stop at their smallest.
    for (let halving = 1; halving <= 3; halving++) {
      const before = wall;
      wall = wallsAfter(cfg, wall);
      const m = minimapMarks(AT, state(HILL, wall, []), {
        view: view(),
        own: undefined,
        tuning: null,
      });
      expect(side(m.edge) / side(first.edge)).toBeCloseTo(wall / cfg.wallHalf, 6);
      if (wall < before) expect(side(m.edge), `halving ${String(halving)}`).toBeLessThan(shown);
      expect(m.panel).toEqual(first.panel);
      shown = side(m.edge);
    }
    expect(wall).toBeLessThan(cfg.wallHalf);
  });
});
