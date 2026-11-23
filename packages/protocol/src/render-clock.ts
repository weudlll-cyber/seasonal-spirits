// Seasonal Spirits — render clock: maps wall time to a server-time render target that advances
// linearly and resyncs when far from `latestServerMs - bufferMs` (pause, restart, drift).

export interface RenderClockOptions {
  bufferMs: number; // target distance behind the latest state's server time
  // If the clock drifts farther than resyncToleranceMs from (latest - bufferMs), snap
  // back. Default: 250 ms, five ticks of a 20 Hz server.
  resyncToleranceMs?: number;
}

export class RenderClock {
  private readonly bufferMs: number;
  private readonly resyncToleranceMs: number;
  private initialised = false;
  private originWallMs = 0;
  private originServerMs = 0;

  constructor(opts: RenderClockOptions) {
    this.bufferMs = opts.bufferMs;
    this.resyncToleranceMs = opts.resyncToleranceMs ?? 250;
  }

  // Called every frame with the latest state's server time (or null if we have none).
  // Returns the render target in server time, or null if we have no reference yet.
  target(nowWallMs: number, latestServerMs: number | null): number | null {
    if (latestServerMs === null) return null;
    if (!this.initialised) {
      this.initialised = true;
      this.originWallMs = nowWallMs;
      this.originServerMs = latestServerMs - this.bufferMs;
      return this.originServerMs;
    }
    const target = this.originServerMs + (nowWallMs - this.originWallMs);
    const desired = latestServerMs - this.bufferMs;
    // Resync when the clock drifted outside the tolerance in either direction.
    if (Math.abs(target - desired) > this.resyncToleranceMs) {
      this.originWallMs = nowWallMs;
      this.originServerMs = desired;
      return desired;
    }
    return target;
  }
}
