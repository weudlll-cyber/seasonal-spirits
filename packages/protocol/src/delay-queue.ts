// Seasonal Spirits — artificial one-way latency with preserved order (bots, headless spectator,
// viewer). Delay uniform in [minMs, maxMs]; delivery = max(previous delivery, now + random)
// keeps the order; 0/0 is a straight pass-through.

export interface DelayQueueClock {
  now(): number;
  schedule(delayMs: number, fn: () => void): void;
}

export const realClock: DelayQueueClock = {
  now: () => Date.now(),
  schedule: (ms, fn) => {
    setTimeout(fn, Math.max(0, ms));
  },
};

export interface Random {
  next(): number; // [0, 1)
}

const mathRandom: Random = { next: () => Math.random() };

// The two seams a test replaces with a fake clock and a scripted random source.
export interface DelayQueueDeps {
  clock: DelayQueueClock;
  rng: Random;
}

export class DelayQueue<T> {
  private readonly minMs: number;
  private readonly maxMs: number;
  private readonly clock: DelayQueueClock;
  private readonly rng: Random;
  private readonly onDeliver: (item: T) => void;
  private lastDelivery = 0; // absolute time of the last scheduled delivery

  constructor(
    minMs: number,
    maxMs: number,
    onDeliver: (item: T) => void,
    deps: DelayQueueDeps = { clock: realClock, rng: mathRandom },
  ) {
    if (minMs < 0 || maxMs < minMs) {
      throw new Error(`DelayQueue: invalid bounds min=${minMs} max=${maxMs}`);
    }
    this.minMs = minMs;
    this.maxMs = maxMs;
    this.clock = deps.clock;
    this.rng = deps.rng;
    this.onDeliver = onDeliver;
  }

  push(item: T): void {
    if (this.minMs === 0 && this.maxMs === 0) {
      this.onDeliver(item);
      return;
    }
    const now = this.clock.now();
    const sampled = this.minMs + this.rng.next() * (this.maxMs - this.minMs);
    const naturalDelivery = now + sampled;
    const delivery = Math.max(this.lastDelivery, naturalDelivery);
    this.lastDelivery = delivery;
    const delay = delivery - now;
    this.clock.schedule(delay, () => {
      this.onDeliver(item);
    });
  }
}
