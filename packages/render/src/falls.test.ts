// Seasonal Sumo — characters off the island: one off the back is drawn before the island's body,
// which hides it, others after it; off the island every character keeps its standing size.

import {
  GHOST_AIRBORNE,
  GHOST_FALLING,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { describe, expect, it, vi } from 'vitest';
import { BreakOff } from './breakoff.js';
import { bodies, recorder } from './canvas-recorder.js';
import { offBack, offIsland } from './fall.js';
import { drawField, islandOf } from './field.js';
import { drawFallsBehind, drawGhosts, type GhostStyle } from './ghosts.js';
import { ghostRadiusPx } from './reach.js';
import { Seasons } from './season.js';
import { Trails } from './trails.js';
import { fitBox, sx, sy } from './view.js';

const AREA = { x: 1000, y: 1000, r: 300 };
const s = {
  mode: 0,
  wall: 0,
  season: 1,
  flags: 0,
  countdownMs: null,
  next: null,
  area: AREA,
} as unknown as ServerState;
const ghost = (id: number, x: number, y: number, flags: number): GhostState => ({
  id,
  team: id % 4,
  x,
  y,
  vx: 0,
  vy: 0,
  flags,
  dashLeftMs: 0,
  score: 0,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
});

const BACK = ghost(1, 1000, 640, GHOST_FALLING);
const FRONT = ghost(2, 1000, 1360, GHOST_FALLING);
const SIDE = ghost(3, 1360, 980, GHOST_FALLING);
const AIR_BACK = ghost(4, 1080, 650, GHOST_AIRBORNE); // a jump that left the island at its back
const STANDING = ghost(5, 1000, 1000, 0);

// One client frame (scene.ts order): the island with the back's characters before its body, then
// the rest; every ellipse drawn, in order, and the view.
function frame(ghosts: GhostState[]) {
  const r = recorder();
  const v = fitBox(r.ctx, 100, { x: 1000, y: 1000, half: 340 });
  const trails = new Trails();
  trails.record(ghosts, 0);
  const style: GhostStyle = { ownId: null, trails, nowMs: 0, fuse: 1, island: islandOf(s) };
  // The front clouds' layer (sky.ts) a canvas that paints nothing; the characters, without a
  // document, straight onto the canvas (sprites.ts).
  const clouds = (): void => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
  };
  clouds();
  const behind = (): void => {
    vi.unstubAllGlobals();
    drawFallsBehind(v, ghosts, style);
    clouds();
  };
  drawField(v, s, 0, { breaks: new BreakOff(), seasons: new Seasons(), behind });
  vi.unstubAllGlobals();
  drawGhosts(v, ghosts, style);
  return { r, v };
}

describe('characters off the island', () => {
  it('tells the back from the sides and the front', () => {
    expect([BACK, AIR_BACK].map((g) => offBack(g, AREA))).toEqual([true, true]);
    expect([FRONT, SIDE, STANDING].map((g) => offBack(g, AREA))).toEqual([false, false, false]);
    expect(offIsland(STANDING, AREA)).toBe(false);
    expect(offIsland(BACK, null)).toBe(false); // the walled modes: no island to fall off
  });

  it("draws one falling off the back before the island's body, the front and side ones after it", () => {
    const { r, v } = frame([BACK, FRONT, SIDE]);
    const islandAt = r.ellipses.findIndex((e) => e.rx > AREA.r * v.scale * 0.5);
    const at = (g: GhostState): number =>
      r.ellipses.findIndex(
        (e) =>
          Math.abs(e.ry / e.rx - 1.04) < 0.001 &&
          Math.hypot(e.x - sx(v, g.x), e.y - sy(v, g.y)) < e.rx, // at the start of its fall
      );
    expect(islandAt).toBeGreaterThanOrEqual(0);
    expect(at(BACK)).toBeGreaterThanOrEqual(0);
    expect(at(BACK)).toBeLessThan(islandAt);
    expect(at(FRONT)).toBeGreaterThan(islandAt);
    expect(at(SIDE)).toBeGreaterThan(islandAt);
  });

  it('keeps the standing size off the island, in the air beyond the back edge too', () => {
    const { r, v } = frame([BACK, AIR_BACK, FRONT]);
    const base = ghostRadiusPx(v);
    const drawn = bodies(r);
    expect(drawn.length).toBeGreaterThanOrEqual(3);
    for (const b of drawn) expect(b.r).toBeCloseTo(base, 6);
    // The jump beyond the edge is drawn where it is, not lifted into the sky above the island.
    const air = drawn.find((b) => Math.abs(b.x - sx(v, AIR_BACK.x)) < 1);
    expect(air?.y).toBeCloseTo(sy(v, AIR_BACK.y), 0);
  });
});
