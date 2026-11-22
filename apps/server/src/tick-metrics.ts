// Seasonal Spirits — the match server's own numbers for /metrics-lite and the probe: achieved
// tick rate, the slowest tick, CPU share, state message size, over a window the probe can reset.
// Kept apart from server.ts, which owns the loop and the sockets.

export interface ServerMetrics {
  achievedHz: number; // computed over the recent window
  maxTickMs: number;
  cpuPercentOfOneCore: number;
  clients: number;
  players: number; // slots steered by a connected player
  ghosts: number; // slots in the match
  stateBytes: number; // the last state message
  maxStateBytes: number; // the largest since the window started
  startedAtMs: number;
  uptimeMs: number;
}

// Who is connected: the server's part of a snapshot.
export type Occupancy = Pick<ServerMetrics, 'clients' | 'players' | 'ghosts'>;

export class TickMetrics {
  readonly startWall: number;
  private windowStart: number;
  private ticksInWindow = 0;
  private maxTickMs = 0;
  private stateBytes = 0;
  private maxStateBytes = 0;
  private cpuBaseline: NodeJS.CpuUsage;

  constructor(now: number) {
    this.startWall = now;
    this.windowStart = now;
    this.cpuBaseline = process.cpuUsage();
  }

  // One tick ran for `tickMs` and sent a state message of `bytes`.
  tick(tickMs: number, bytes: number): void {
    this.stateBytes = bytes;
    this.maxStateBytes = Math.max(this.maxStateBytes, bytes);
    this.maxTickMs = Math.max(this.maxTickMs, tickMs);
    this.ticksInWindow++;
  }

  snapshot(now: number, who: Occupancy): ServerMetrics {
    const cpu = process.cpuUsage(this.cpuBaseline);
    const windowMs = now - this.windowStart;
    return {
      achievedHz: windowMs > 0 ? (this.ticksInWindow * 1000) / windowMs : 0,
      maxTickMs: this.maxTickMs,
      cpuPercentOfOneCore: windowMs > 0 ? ((cpu.user + cpu.system) / 1000 / windowMs) * 100 : 0,
      ...who,
      stateBytes: this.stateBytes,
      maxStateBytes: this.maxStateBytes,
      startedAtMs: this.startWall,
      uptimeMs: now - this.startWall,
    };
  }

  // A new window: the numbers from here on (the probe, after its bots have joined).
  reset(now: number): void {
    this.windowStart = now;
    this.ticksInWindow = 0;
    this.maxTickMs = 0;
    this.maxStateBytes = 0;
    this.cpuBaseline = process.cpuUsage();
  }
}
