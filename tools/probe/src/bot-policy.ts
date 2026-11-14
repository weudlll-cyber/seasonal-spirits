// Seasonal Spirits — bot policy (pure, testable). The ProbeBot wraps it with sockets and
// a real clock. The policy decides when to pick a new direction (every 0.5-2 s) and how
// to turn when near a wall.

export interface BotClock {
  now(): number;
}

export interface BotPolicyOptions {
  worldSize: number;
  wallMargin: number;
  rng: () => number;
  clock: BotClock;
}

export class BotPolicy {
  private readonly opts: BotPolicyOptions;
  private dx = 0;
  private dy = 0;
  private nextTurnAt: number;

  constructor(opts: BotPolicyOptions) {
    this.opts = opts;
    this.chooseDirection();
    this.nextTurnAt = opts.clock.now() + this.sampleInterval();
  }

  // Returns the direction to send right now, given the bot's known position in the world.
  tick(x: number | null, y: number | null): { dx: number; dy: number } {
    const now = this.opts.clock.now();
    if (now >= this.nextTurnAt) {
      this.chooseDirection();
      this.nextTurnAt = now + this.sampleInterval();
    }
    if (x !== null && y !== null) {
      const m = this.opts.wallMargin;
      const s = this.opts.worldSize;
      if (x < m && this.dx < 0) this.dx = Math.abs(this.dx);
      if (x > s - m && this.dx > 0) this.dx = -Math.abs(this.dx);
      if (y < m && this.dy < 0) this.dy = Math.abs(this.dy);
      if (y > s - m && this.dy > 0) this.dy = -Math.abs(this.dy);
    }
    return { dx: this.dx, dy: this.dy };
  }

  get nextTurnTime(): number {
    return this.nextTurnAt;
  }

  private chooseDirection(): void {
    const angle = this.opts.rng() * Math.PI * 2;
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
  }

  private sampleInterval(): number {
    return 500 + this.opts.rng() * 1500; // 0.5..2.0 s
  }
}
