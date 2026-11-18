// Seasonal Sumo — the characters' effect moments (NIGHT 2026-11-19, piece 2): a landing squashes
// and kicks up dust, a dash's start stretches, a knock shows a star between it and the dasher and
// spiral eyes while it slides; with reduced motion the effects are half as long.

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GHOST_AIRBORNE,
  GHOST_BOT,
  GHOST_DASHING,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { Moments, SQUASH_MS, STAR_MS, fastSpeed } from './moments.js';
import { shape } from './shape.js';

const ghost = (id: number, over: Partial<GhostState> = {}): GhostState => ({
  id,
  team: 0,
  x: 1000,
  y: 1000,
  vx: 0,
  vy: 0,
  flags: GHOST_BOT,
  dashLeftMs: 0,
  score: 0,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('effect moments', () => {
  it('squashes a character and kicks up dust when it lands, then lets go', () => {
    const m = new Moments();
    m.record([ghost(1, { flags: GHOST_BOT | GHOST_AIRBORNE })], 0);
    expect(m.squash(1, 10)).toBe(1);
    m.record([ghost(1)], 100);
    expect(m.squash(1, 100 + SQUASH_MS / 2)).toBeGreaterThan(1.2);
    expect(m.dust(1, 150)).not.toBeNull();
    expect(m.squash(1, 100 + SQUASH_MS)).toBe(1);
  });

  it('stretches a character upright as its dash starts', () => {
    const m = new Moments();
    m.record([ghost(1)], 0);
    m.record([ghost(1, { flags: GHOST_BOT | GHOST_DASHING })], 50);
    expect(m.squash(1, 120)).toBeLessThan(0.85);
  });

  it('shows a star halfway to the dasher and spiral eyes while the knocked one slides', () => {
    const m = new Moments();
    const r = shape().ghostRadius;
    const dasher = ghost(2, { x: 1000 - 2 * r, flags: GHOST_BOT | GHOST_DASHING });
    m.record([ghost(1), dasher], 0);
    m.record([ghost(1, { vx: fastSpeed() * 1.5 }), dasher], 20);
    expect(m.star(1, 40)).toMatchObject({ x: 1000 - r, y: 1000 });
    expect(m.dizzy(1)).toBe(true);
    expect(m.star(1, 20 + STAR_MS)).toBeNull();
    m.record([ghost(1), dasher], 400);
    expect(m.dizzy(1)).toBe(false);
  });

  it('shows no star for a fast character with no dasher near', () => {
    const m = new Moments();
    m.record([ghost(1)], 0);
    m.record([ghost(1, { vx: fastSpeed() * 1.5 })], 20);
    expect(m.star(1, 30)).toBeNull();
  });

  it('halves the effects with prefers-reduced-motion', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const fresh = await import('./moments.js');
    const m = new fresh.Moments();
    m.record([ghost(1, { flags: GHOST_BOT | GHOST_AIRBORNE })], 0);
    m.record([ghost(1)], 100);
    expect(m.squash(1, 100 + fresh.SQUASH_MS * 0.6)).toBe(1);
  });
});
