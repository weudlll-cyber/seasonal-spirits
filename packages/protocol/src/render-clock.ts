// Seasonal Spirits — render clock.
// Maps wall time to a server-time render target so interpolation is smooth between state
// arrivals. The target advances linearly with wall time and resyncs on large discrepancies
// (the client has been paused, the server stream has restarted, or the clock drifted far
// from `latestServerMs - bufferMs`).

export interface RenderClockOptions {
  bufferMs: number; // target distance behind the latest state's server time
  // If the clock drifts farther than resyncToleranceMs from (latest - bufferMs), snap
  // back. Default: half a tick's worth of a 20 Hz server.
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
