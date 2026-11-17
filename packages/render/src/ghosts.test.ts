// Seasonal Sumo — the own ghost is always labelled "You": also with the respawn protection's
// dashed ring around it and in a crowd (owner 2026-11-17: no ghost showed "You").

import { describe, expect, it } from 'vitest';
import { GHOST_BOT, GHOST_PROTECTED, type GhostState } from '@seasonal-spirits/protocol';
import { Trails, drawGhosts } from './ghosts.js';
import { fitField } from './view.js';

// A canvas that draws nothing and measures text at 6 px per character.
const canvas = { width: 1280, height: 800 };
const ctx = new Proxy<Record<string | symbol, unknown>>(
  { canvas },
  {
    get: (o, k) =>
      k in o
        ? o[k]
        : k === 'measureText'
          ? (t: string) => ({ width: 6 * t.length })
          : () => undefined,
    set: (o, k, v) => {
      if (k !== 'canvas') o[k] = v;
      return true;
    },
  },
) as unknown as CanvasRenderingContext2D;

const ghost = (id: number, x: number, flags: number, score = 0): GhostState => ({
  id,
  team: id % 4,
  x,
  y: 1000,
  vx: 0,
  vy: 0,
  flags,
  dashLeftMs: 0,
  score,
});

describe('own label', () => {
  it('calls the own ghost "You" during its respawn protection, in a crowd', () => {
    const own = ghost(3, 1000, GHOST_PROTECTED, 4);
    const crowd = [1, 2, 4, 5, 6, 7].map((id) => ghost(id, 960 + id * 12, GHOST_BOT, id));
    const labels = drawGhosts(fitField(ctx, 132), [...crowd, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      labelAll: false,
      fuse: 1,
    });
    expect(labels.find((l) => l.id === 3)?.text).toBe('You · 4');
  });
});
