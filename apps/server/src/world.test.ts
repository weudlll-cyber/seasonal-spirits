// Seasonal Spirits — world tests: tick moves and clamps, direction is normalized.

import { describe, expect, it } from 'vitest';
import { World } from './world.js';

describe('World', () => {
  it('moves a ghost and clamps at the wall', () => {
    const w = new World({ size: 100, speed: 300 });
    w.start(0);
    w.addGhost(42);
    w.setDirection(42, 1, 0); // right
    // In 500 ms at speed 300: 150 units; starts somewhere in [0,100); will clamp to 100.
    const s = w.advance(500, 500);
    expect(s.ghosts[0]?.x).toBe(100);
  });

  it('clamps a direction with magnitude > 1 to unit length', () => {
    const w = new World({ size: 1000, speed: 300 });
    w.start(0);
    w.addGhost(1);
    w.setDirection(1, 3, 4); // magnitude 5 → clamped to (0.6, 0.8)
    const s = w.advance(1000, 1000);
    // moved 300 units total; unit (0.6, 0.8) → (180, 240) delta from a deterministic start
    const start = {
      x: (((1 * 9301 + 49297) % 1000) + 1000) % 1000,
      y: (((1 * 24593 + 8521) % 1000) + 1000) % 1000,
    };
    const g = s.ghosts[0];
    expect(g).toBeDefined();
    expect((g?.x ?? NaN) - start.x).toBeCloseTo(180, 5);
    expect((g?.y ?? NaN) - start.y).toBeCloseTo(240, 5);
  });

  it('takes no position from the client — only the direction is applied', () => {
    const w = new World({ size: 1000, speed: 300 });
    w.start(0);
    w.addGhost(7);
    const before = w.snapshot(0).ghosts[0];
    w.setDirection(7, 0, 0);
    const after = w.advance(100, 100).ghosts[0];
    expect(before).toBeDefined();
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
  });
});
