// Seasonal Sumo — Halving Bomb's "no return" mark: drawn only over the ghost that may not take the
// bomb back yet, above its hat or its own bomb, and its label keeps clear of it.

import { GHOST_BOMB, GHOST_NO_RETURN, type GhostState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bombReach } from './bomb.js';
import { recorder } from './canvas-recorder.js';
import { drawGhosts } from './ghosts.js';
import { noReturnReach } from './no-return.js';
import { ghostRadiusPx, ghostReach } from './reach.js';
import { Trails } from './trails.js';
import { fitField, sy } from './view.js';

const CROSS = '#d6334a';

const ghost = (id: number, x: number, flags: number): GhostState => ({
  id,
  team: id % 4,
  x,
  y: 1000,
  vx: 0,
  vy: 0,
  flags,
  dashLeftMs: 0,
  score: 0,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
});

// The red cross-out strokes drawn for `ghosts`.
function crosses(ghosts: GhostState[]): number {
  const r = recorder();
  let n = 0;
  const stroke = (): void => {
    if (r.ctx.strokeStyle === CROSS) n++;
  };
  Object.assign(r.ctx, { stroke });
  drawGhosts(fitField(r.ctx, 100), ghosts, {
    ownId: null,
    trails: new Trails(),
    nowMs: 0,
    fuse: 1,
  });
  return n;
}

describe('the "no return" mark', () => {
  it('is drawn over the locked ghost only', () => {
    expect(crosses([ghost(1, 900, 0), ghost(2, 1100, GHOST_BOMB)])).toBe(0);
    expect(crosses([ghost(1, 900, GHOST_NO_RETURN), ghost(2, 1100, GHOST_BOMB)])).toBe(1);
  });

  it('stands above the hat, or above the bomb of a ghost that carries one again', () => {
    const r = 12;
    const plain = ghostReach(r, ghost(1, 0, 0));
    expect(ghostReach(r, ghost(1, 0, GHOST_NO_RETURN))).toBe(noReturnReach(r, false));
    expect(noReturnReach(r, false)).toBeGreaterThan(plain);
    expect(noReturnReach(r, true)).toBeGreaterThan(bombReach(r));
    expect(ghostReach(r, ghost(1, 0, GHOST_NO_RETURN | GHOST_BOMB))).toBe(noReturnReach(r, true));
  });

  it("keeps the ghost's label above the mark", () => {
    const r = recorder();
    const v = fitField(r.ctx, 100);
    const g = ghost(1, 1000, GHOST_NO_RETURN); // a player: always labelled
    const [label] = drawGhosts(v, [g], { ownId: null, trails: new Trails(), nowMs: 0, fuse: 1 });
    const markTop = sy(v, g.y) - noReturnReach(ghostRadiusPx(v), false);
    expect(label?.y).toBeLessThanOrEqual(markTop);
  });
});
