// Seasonal Sumo — the jump drawn (NIGHT 2026-11-18): the body rises and grows on an arc over its
// time in the air and comes down again, its shadow stays on the ground at its real position, a
// ring spreads at the take-off, and "Dodged!" shows when the server flags a dash passing under.

import { describe, expect, it } from 'vitest';
import { GHOST_AIRBORNE, GHOST_DODGED, type GhostState } from '@seasonal-spirits/protocol';
import { drawGhosts, ghostRadiusPx } from './ghosts.js';
import { Trails } from './trails.js';
import { fitField, sx, sy } from './view.js';

const canvas = { width: 1280, height: 800 };
const AIR_MS = 500; // the default jump's time in the air (render shape.ts)

// A canvas that records the circles (arc) and ellipses drawn, and the texts filled.
function recorder() {
  const arcs: { x: number; y: number; r: number }[] = [];
  const ellipses: { x: number; y: number }[] = [];
  const texts: string[] = [];
  const calls: Record<string, (...a: never[]) => unknown> = {
    arc: (x: number, y: number, r: number) => arcs.push({ x, y, r }),
    ellipse: (x: number, y: number) => ellipses.push({ x, y }),
    fillText: (t: string) => texts.push(t),
    measureText: () => ({ width: 30 }),
  };
  const rec = new Proxy<Record<string | symbol, unknown>>(
    { canvas },
    {
      get: (o, k) =>
        k in o ? o[k] : typeof k === 'string' && k in calls ? calls[k] : () => undefined,
      set: (o, k, v) => {
        if (k !== 'canvas') o[k] = v;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { rec, arcs, ellipses, texts };
}

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

// The frame `atMs` after a take-off at 0: the body's circle (the largest drawn at the body's x).
function frame(atMs: number, flags = GHOST_AIRBORNE) {
  const trails = new Trails();
  trails.record([ghost(GHOST_AIRBORNE)], 0);
  trails.record([ghost(flags)], atMs);
  const r = recorder();
  const v = fitField(r.rec, 132);
  drawGhosts(v, [ghost(flags)], {
    ownId: null,
    trails,
    nowMs: atMs,
    labelAll: false,
    fuse: 1,
  });
  // The body: lifted off the ground (the take-off ring stays at the real position).
  const body = r.arcs.filter((a) => a.x === sx(v, 1000) && a.y < sy(v, 1000))[0];
  return { r, v, body };
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
    expect(top.r.ellipses).toHaveLength(1);
    expect(top.r.ellipses[0]?.x).toBe(sx(top.v, 1000));
    expect(top.r.ellipses[0]?.y).toBeGreaterThan(sy(top.v, 1000));
  });

  it('spreads a ring on the ground at the take-off', () => {
    const { r, v } = frame(50);
    const ground = r.arcs.filter((a) => a.y === sy(v, 1000) && a.r > ghostRadiusPx(v));
    expect(ground.length).toBeGreaterThan(0);
  });

  it('says "Dodged!" only when the server flags a dash passing under', () => {
    expect(frame(100).r.texts).not.toContain('Dodged!');
    expect(frame(100, GHOST_AIRBORNE | GHOST_DODGED).r.texts).toContain('Dodged!');
  });
});
