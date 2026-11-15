// Seasonal Spirits — jump detector for the rendered frame stream.
// A "jump" is one rendered frame in which any ghost moves farther than
// 2 * (speed * frameDt) + 2 units compared to the previous frame.
// This catches both missing interpolation and a bad extrapolation; the owner reads the
// per-60-second count.

import type { GhostState } from './state.js';

// The detector looks at positions only.
type Placed = Pick<GhostState, 'id' | 'x' | 'y'>;

export interface JumpDetectorOptions {
  speedUnitsPerSecond: number;
}

export class JumpDetector {
  private readonly speed: number;
  private previous: Map<number, { x: number; y: number }> | null = null;
  private previousTime = 0;

  constructor(opts: JumpDetectorOptions) {
    this.speed = opts.speedUnitsPerSecond;
  }

  // Returns the number of ghosts that jumped this frame.
  observe(frameTimeMs: number, ghosts: readonly Placed[]): number {
    if (this.previous === null) {
      this.previous = snapshot(ghosts);
      this.previousTime = frameTimeMs;
      return 0;
    }
    const dt = Math.max(0, frameTimeMs - this.previousTime) / 1000;
    const threshold = 2 * this.speed * dt + 2;
    let jumps = 0;
    for (const g of ghosts) {
      const prev = this.previous.get(g.id);
      if (!prev) continue;
      const dx = g.x - prev.x;
      const dy = g.y - prev.y;
      if (Math.hypot(dx, dy) > threshold) jumps++;
    }
    this.previous = snapshot(ghosts);
    this.previousTime = frameTimeMs;
    return jumps;
  }
}

function snapshot(ghosts: readonly Placed[]): Map<number, { x: number; y: number }> {
  const m = new Map<number, { x: number; y: number }>();
  for (const g of ghosts) m.set(g.id, { x: g.x, y: g.y });
  return m;
}

// Rolling 60-second counter for jumps or underruns.
export class PerMinuteCounter {
  private events: number[] = []; // timestamps in ms

  record(nowMs: number, count = 1): void {
    for (let i = 0; i < count; i++) this.events.push(nowMs);
    this.trim(nowMs);
  }

  value(nowMs: number): number {
    this.trim(nowMs);
    return this.events.length;
  }

  private trim(nowMs: number): void {
    const cutoff = nowMs - 60_000;
    while (this.events[0] !== undefined && this.events[0] < cutoff) this.events.shift();
  }
}
