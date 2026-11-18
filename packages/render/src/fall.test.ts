// Seasonal Sumo — falling off the island (Sky Island look, 2026-11-18): the character drops from
// where it fell towards the sea band, shrinking, and at the end of the fall time only its
// splash shows, on the sea band.

import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawFall } from './fall.js';
import { seaTop } from './sky.js';

const at = { x: 400, y: 300, r: 12, team: 2, left: false };

describe('falling off the island', () => {
  it('drops shrinking from the edge towards the sea', () => {
    const sea = seaTop(800);
    const mid = recorder();
    drawFall(mid.ctx, at, 0.5);
    const body = bodies(mid)[0];
    expect(body?.y).toBeGreaterThan(at.y);
    expect(body?.y).toBeLessThan(sea);
    expect(body?.r).toBeLessThan(at.r);
    expect(mid.texts).toContain('Aaah!');
  });

  it('ends in a splash on the sea band, the character gone', () => {
    const end = recorder();
    drawFall(end.ctx, at, 0.95);
    expect(bodies(end)).toEqual([]);
    const splash = end.ellipses.filter((e) => e.x === at.x && Math.abs(e.y - seaTop(800)) < 10);
    expect(splash.length).toBeGreaterThan(0);
  });
});
