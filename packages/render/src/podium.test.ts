// Seasonal Sumo — the result's podium: its place numbers and its confetti. Why: the numbers are a
// game text by the owner's decision (DECISIONS D10), so a font change for the official frame must
// not reach them; the confetti is decoration, which reduced motion stops (audit 2026-11-22 P6
// item 6).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { drawPodium } from './podium.js';

const TEAMS = [2, 0, 3];

// The confetti's pieces are the only filled rectangles: their count for a frame `nowMs` after the
// result showed, with `draw` (a fresh module under a stubbed motion setting, or this one).
function rects(draw: typeof drawPodium, nowMs: number): number {
  let n = 0;
  const { ctx } = recorder(300, 190);
  const count = (): void => {
    n++;
  };
  const counting = new Proxy(ctx, {
    get: (o, k): unknown => (k === 'fillRect' ? count : Reflect.get(o, k)),
  });
  draw(counting, TEAMS, { nowMs, sinceMs: 0 });
  return n;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('drawPodium', () => {
  it('draws the place numbers 1, 2, 3 in Fredoka', () => {
    const r = recorder(300, 190);
    drawPodium(r.ctx, TEAMS, { nowMs: 0, sinceMs: 0 });
    const places = r.textsAt.filter((t) => ['1', '2', '3'].includes(t.text));
    expect(places.map((t) => t.text)).toEqual(['1', '2', '3']);
    for (const t of places) expect(t.font).toMatch(/\bFredoka\b/);
  });

  it('bursts confetti just after the result, and none with prefers-reduced-motion', async () => {
    expect(rects(drawPodium, 400)).toBeGreaterThan(rects(drawPodium, 5000));
    vi.resetModules();
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const still = (await import('./podium.js')).drawPodium;
    expect(rects(still, 400)).toBe(rects(still, 5000));
  });
});
