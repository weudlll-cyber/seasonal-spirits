// Seasonal Sumo — what stands up on the island (owner 2026-11-19: the crack lay over the trees, the
// fence over the characters): every tree, pebble and lantern, every fence post and rail
// (fence.ts) and King's flag poles (zone.ts), each a piece with the screen y of its foot, drawn in
// one depth order with the characters (ghosts.ts); the crown floats over all of them. Everything
// flat lies under them (field.ts drawField).

import { walled } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import {
  LANTERNS,
  PEBBLES,
  TREES,
  drawLantern,
  drawPebble,
  drawTree,
  freeOf,
  lanternSize,
  pebbleSize,
  spotOn,
} from './decor.js';
import { fencePieces } from './fence.js';
import { playBox } from './field.js';
import type { OnScreen } from './island.js';
import { clientConfig, zoneOf } from './modes.js';
import { ambientMs } from './motion.js';
import { look, seasonColour } from './palette.js';
import type { Seasons } from './season.js';
import { drawSeasonOnPebble, drawSeasonOnTree } from './season-decor.js';
import type { View } from './view.js';
import { drawZoneCrown, zonePoles } from './zone.js';

// A thing standing on the island: the screen y of its foot (a character's is its centre's, the
// sort key of view.ts byDepth) and how to draw it.
export interface Standing {
  y: number;
  draw: () => void;
}

// The island's standing pieces for the depth order, and what floats over everything (the crown).
export interface FieldStanding {
  pieces: Standing[];
  over: () => void;
}

export function fieldStanding(
  v: View,
  s: ServerState | undefined,
  ground: OnScreen,
  { nowMs, seasons }: { nowMs: number; seasons: Seasons },
): FieldStanding {
  const { ctx } = v;
  const t = ambientMs(nowMs) / 1000;
  const trees = freeOf(ground, TREES).map(({ p, i }) => ({
    y: spotOn(ground, p)[1],
    draw: () => {
      drawTree(ctx, ground, i, t);
      drawSeasonOnTree(ctx, ground, { seasons, nowMs, i });
    },
  }));
  const pebbles = freeOf(ground, PEBBLES).map(({ p }) => ({
    y: spotOn(ground, p)[1] + pebbleSize(ground) * 0.6,
    draw: () => {
      drawPebble(ctx, ground, p);
      drawSeasonOnPebble(ctx, ground, { seasons, nowMs, p });
    },
  }));
  const lanterns = look().night
    ? freeOf(ground, LANTERNS).map(({ p }) => {
        const at = spotOn(ground, p);
        return {
          y: at[1],
          draw: () => {
            drawLantern(ctx, at, lanternSize(ground));
          },
        };
      })
    : [];
  const pieces: Standing[] = [...trees, ...pebbles, ...lanterns];
  if (!walled(clientConfig(s?.mode ?? 0))) return { pieces, over: () => undefined };
  pieces.push(...fencePieces(v, playBox(s)));
  const zone = zoneOf(s);
  if (!zone || !s) return { pieces, over: () => undefined };
  pieces.push(...zonePoles(v, zone, seasonColour(s.season)));
  return {
    pieces,
    over: () => {
      drawZoneCrown(v, zone);
    },
  };
}
