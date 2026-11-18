// Seasonal Sumo — the jump drawn (NIGHT 2026-11-18): the character rises and grows on an arc
// over its time in the air and comes down again, its shadow stays on the ground at its real
// position, a ring spreads at the take-off, and "Dodged!" shows when the server flags a dash
// passing under.

import { describe, expect, it } from 'vitest';
import { GHOST_AIRBORNE, GHOST_DODGED, type GhostState } from '@seasonal-spirits/protocol';
import { bodies, recorder } from './canvas-recorder.js';
import { drawGhosts } from './ghosts.js';
import { ghostRadiusPx } from './reach.js';
import { Trails } from './trails.js';
import { fitField, sx, sy } from './view.js';

const AIR_MS = 500; // the default jump's time in the air (render shape.ts)

const ghost = (flags: number): GhostState => ({
  id: 5,
  team: 1,
  x: 1000,
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

// The frame `atMs` after a take-off at 0: its body, lifted off the ground.
function frame(atMs: number, flags = GHOST_AIRBORNE) {
  const trails = new Trails();
  trails.record([ghost(GHOST_AIRBORNE)], 0);
  trails.record([ghost(flags)], atMs);
  const r = recorder();
  const v = fitField(r.ctx, 132);
  drawGhosts(v, [ghost(flags)], {
    ownId: null,
    trails,
    nowMs: atMs,
    labelAll: false,
    fuse: 1,
  });
  return { r, v, body: bodies(r)[0] };
}

describe('the jump drawn', () => {
  it('rises and grows on an arc over its time in the air, highest at the middle', () => {
    const start = frame(1);
    const top = frame(AIR_MS / 2);
    const late = frame(AIR_MS * 0.9);
    const base = ghostRadiusPx(top.v);
    expect(top.body?.r).toBeCloseTo(base * 1.5, 1);
    expect(top.body?.y).toBeLessThan(sy(top.v, 1000) - base * 1.5); // a diameter up
    expect(start.body?.y ?? 0).toBeGreaterThan(top.body?.y ?? 0);
    expect(late.body?.y ?? 0).toBeGreaterThan(top.body?.y ?? 0);
  });

  it('keeps the shadow on the ground at the real position', () => {
    const top = frame(AIR_MS / 2);
    // The shadow: dark, and smaller than the body at the top (the take-off ring, wider, is
    // stroked over the same fill colour).
    const r0 = ghostRadiusPx(top.v);
    const shadows = top.r.ellipses.filter((e) => e.fill.startsWith('rgba(20, 14, 40') && e.rx < r0);
    expect(shadows).toHaveLength(1);
    expect(shadows[0]?.x).toBe(sx(top.v, 1000));
    expect(shadows[0]?.y).toBeGreaterThan(sy(top.v, 1000));
  });

  it('spreads a ring on the ground at the take-off', () => {
    const { r, v } = frame(50);
    const r0 = ghostRadiusPx(v);
    const ground = r.ellipses.filter((e) => e.y === sy(v, 1000) + r0 && e.rx > r0 * 1.08);
    expect(ground.length).toBeGreaterThan(0);
  });

  it('says "Dodged!" only when the server flags a dash passing under', () => {
    expect(frame(100).r.texts).not.toContain('Dodged!');
    expect(frame(100, GHOST_AIRBORNE | GHOST_DODGED).r.texts).toContain('Dodged!');
  });
});
