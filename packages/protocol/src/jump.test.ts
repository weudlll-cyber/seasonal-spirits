// Seasonal Spirits — jump detector tests at/around threshold.
// The probe and the viewer count a drawn position that jumps too far as a glitch.

import { describe, expect, it } from 'vitest';
import { JumpDetector } from './jump.js';

describe('JumpDetector', () => {
  it('does not fire for normal-speed motion', () => {
    const d = new JumpDetector({ speedUnitsPerSecond: 300 });
    d.observe(0, [{ id: 1, x: 0, y: 0 }]);
    // 50 ms later, 300 units/s * 0.05 s = 15 units. Threshold = 2 * 15 + 2 = 32.
    const jumps = d.observe(50, [{ id: 1, x: 15, y: 0 }]);
    expect(jumps).toBe(0);
  });

  it('fires when a ghost moves far beyond the threshold', () => {
    const d = new JumpDetector({ speedUnitsPerSecond: 300 });
    d.observe(0, [{ id: 1, x: 0, y: 0 }]);
    // 50 ms, threshold 32, we move 500 units.
    const jumps = d.observe(50, [{ id: 1, x: 500, y: 0 }]);
    expect(jumps).toBe(1);
  });

  it('ignores a new ghost (no previous reference)', () => {
    const d = new JumpDetector({ speedUnitsPerSecond: 300 });
    d.observe(0, [{ id: 1, x: 0, y: 0 }]);
    const jumps = d.observe(50, [
      { id: 1, x: 10, y: 0 },
      { id: 2, x: 9000, y: 9000 },
    ]);
    expect(jumps).toBe(0);
  });
});
