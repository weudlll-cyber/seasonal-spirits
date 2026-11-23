// Seasonal Sumo — the result's podium: its place numbers. Why: they are a game text by the
// owner's decision (DECISIONS D10), so a font change for the official frame must not reach them.

import { describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { drawPodium } from './podium.js';

describe('drawPodium', () => {
  it('draws the place numbers 1, 2, 3 in Fredoka', () => {
    const r = recorder(300, 190);
    drawPodium(r.ctx, [2, 0, 3], { nowMs: 0, sinceMs: 0 });
    const places = r.textsAt.filter((t) => ['1', '2', '3'].includes(t.text));
    expect(places.map((t) => t.text)).toEqual(['1', '2', '3']);
    for (const t of places) expect(t.font).toMatch(/\bFredoka\b/);
  });
});
