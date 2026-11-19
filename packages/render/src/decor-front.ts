// Seasonal Sumo — what stands on the island in front of a character covers it (2026-11-19: a
// character behind a tree was drawn over the tree). The decoration is drawn under the characters
// (field.ts); afterwards, for every tree, pebble or lantern that stands in front of a character it
// overlaps on screen, the decoration is drawn again clipped to that thing's shape, so it covers
// the character as depth wants — the same drawing (decor.ts, season-decor.ts), no second one.

import { GHOST_FALLING, GHOST_OUT, type GhostState } from '@seasonal-spirits/protocol';
import {
  LANTERNS,
  PEBBLES,
  TREES,
  crownOf,
  drawDecor,
  freeOf,
  lanternSize,
  pebbleSize,
  spotOn,
} from './decor.js';
import type { OnScreen } from './island.js';
import { ambientMs } from './motion.js';
import { look } from './palette.js';
import { ghostRadiusPx } from './reach.js';
import type { Seasons } from './season.js';
import { drawSeasonOn } from './season-decor.js';
import { sx, sy, type View } from './view.js';

const EDGE = 2; // px the clip reaches past a shape, for its ink outline

// A standing thing on screen: where it stands (its base) and its outline as a path.
interface Standing {
  x: number;
  base: number; // screen y of its foot: a character above it on screen stands behind it
  top: number;
  half: number; // half its width
  path: (ctx: CanvasRenderingContext2D) => void;
}

function standing(o: OnScreen, nowMs: number): Standing[] {
  const t = ambientMs(nowMs) / 1000;
  const trees = freeOf(o, TREES).map(({ p, i }): Standing => {
    const [x, y] = spotOn(o, p);
    const c = crownOf(o, i, t);
    return {
      x,
      base: y,
      top: c.y - c.r,
      half: c.r,
      path: (ctx) => {
        ctx.rect(x - c.r * 0.18 - EDGE, y - c.r * 1.2, c.r * 0.36 + 2 * EDGE, c.r * 1.2 + EDGE);
        ctx.moveTo(c.x + c.r + EDGE, c.y);
        ctx.arc(c.x, c.y, c.r + EDGE, 0, Math.PI * 2);
      },
    };
  });
  const s = pebbleSize(o);
  const pebbles = freeOf(o, PEBBLES).map(({ p }): Standing => {
    const [x, y] = spotOn(o, p);
    return {
      x,
      base: y + s * 0.6,
      top: y - s * 0.6,
      half: s,
      path: (ctx) => {
        ctx.ellipse(x, y, s + EDGE, s * 0.6 + EDGE, 0, 0, Math.PI * 2);
      },
    };
  });
  if (!look().night) return [...trees, ...pebbles];
  const r = lanternSize(o);
  const lanterns = freeOf(o, LANTERNS).map(({ p }): Standing => {
    const [x, y] = spotOn(o, p);
    return {
      x,
      base: y,
      top: y - r * 4,
      half: r,
      path: (ctx) => {
        ctx.rect(x - r * 0.2 - EDGE, y - r * 3, r * 0.4 + 2 * EDGE, r * 3 + EDGE);
        ctx.moveTo(x + r + EDGE, y - r * 3);
        ctx.arc(x, y - r * 3, r + EDGE, 0, Math.PI * 2);
      },
    };
  });
  return [...trees, ...pebbles, ...lanterns];
}

// After the characters: every standing thing in front of one it overlaps is drawn again over it.
export function drawDecorInFront(
  v: View,
  ground: OnScreen,
  ghosts: readonly GhostState[],
  { nowMs, seasons }: { nowMs: number; seasons: Seasons },
): void {
  const r = ghostRadiusPx(v);
  const bodies = ghosts
    .filter((g) => !(g.flags & (GHOST_FALLING | GHOST_OUT)))
    .map((g) => ({ x: sx(v, g.x), y: sy(v, g.y) }));
  const { ctx } = v;
  for (const s of standing(ground, nowMs)) {
    const covers = bodies.some(
      (b) =>
        b.y < s.base &&
        Math.abs(b.x - s.x) < s.half + r * 1.2 &&
        b.y + r > s.top &&
        b.y - 2.2 * r < s.base,
    );
    if (!covers) continue;
    ctx.save();
    ctx.beginPath();
    s.path(ctx);
    ctx.clip();
    drawDecor(ctx, ground, nowMs);
    drawSeasonOn(ctx, ground, seasons, nowMs);
    ctx.restore();
  }
}
