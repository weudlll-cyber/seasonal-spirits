// Seasonal Spirits — a probe bot. A normal WebSocket player: a direction every 50 ms,
// a fresh random direction every 0.5-2 s, and a wall turn at the world edge. Outgoing and
// incoming messages pass through the artificial delay queue.

import WebSocket, { type RawData } from 'ws';
import { mulberry32 } from '@seasonal-spirits/game-core';
import { DelayQueue, decodeState, type ServerState } from '@seasonal-spirits/protocol';

export interface BotOptions {
  url: string;
  worldSize: number;
  latencyMinMs: number;
  latencyMaxMs: number;
  seed: number;
}

export class ProbeBot {
  private readonly opts: BotOptions;
  private ws: WebSocket;
  private readonly rng: () => number;
  private dx = 0;
  private dy = 0;
  private x = 0;
  private y = 0;
  private hasPos = false;
  private nextTurnAt = 0;
  private sendTimer: NodeJS.Timeout | null = null;
  private readonly outbound: DelayQueue<string>;
  private readonly inbound: DelayQueue<Uint8Array>;
  private statesReceived = 0;
  private id = 0;

  constructor(opts: BotOptions) {
    this.opts = opts;
    this.rng = mulberry32(opts.seed);
    this.outbound = new DelayQueue<string>(opts.latencyMinMs, opts.latencyMaxMs, (s) => {
      if (this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    });
    this.inbound = new DelayQueue<Uint8Array>(opts.latencyMinMs, opts.latencyMaxMs, (buf) => {
      this.onState(decodeState(buf));
    });
    this.ws = new WebSocket(opts.url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.on('open', () => {
      this.onOpen();
    });
    this.ws.on('message', (data: RawData) => {
      this.inbound.push(toUint8Array(data));
    });
    this.ws.on('error', () => {
      // swallowed; probe will report "clients" from the server metrics
    });
  }

  private onOpen(): void {
    this.outbound.push(JSON.stringify({ kind: 'player' }));
    // Pick a first random direction and schedule the next change.
    this.chooseDirection();
    this.scheduleNextTurn();
    this.sendTimer = setInterval(() => {
      this.sendInput();
    }, 50);
  }

  private chooseDirection(): void {
    const angle = this.rng() * Math.PI * 2;
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
  }

  private scheduleNextTurn(): void {
    this.nextTurnAt = Date.now() + 500 + this.rng() * 1500;
  }

  private sendInput(): void {
    // Wall turn: if we know where we are and we're pointing out of the world, flip inward.
    if (this.hasPos) {
      const margin = 50;
      if (this.x < margin && this.dx < 0) this.dx = Math.abs(this.dx);
      if (this.x > this.opts.worldSize - margin && this.dx > 0) this.dx = -Math.abs(this.dx);
      if (this.y < margin && this.dy < 0) this.dy = Math.abs(this.dy);
      if (this.y > this.opts.worldSize - margin && this.dy > 0) this.dy = -Math.abs(this.dy);
    }
    if (Date.now() >= this.nextTurnAt) {
      this.chooseDirection();
      this.scheduleNextTurn();
    }
    this.outbound.push(JSON.stringify({ kind: 'input', dx: this.dx, dy: this.dy }));
  }

  private onState(s: ServerState): void {
    this.statesReceived++;
    if (this.id === 0 && s.ghosts.length > 0) {
      // We identify our own ghost by the last one added; but that's fragile. Instead we
      // just read the whole state and approximate our own position by averaging — good
      // enough for a "turn at the wall" heuristic in the probe.
      let sx = 0;
      let sy = 0;
      for (const g of s.ghosts) {
        sx += g.x;
        sy += g.y;
      }
      this.x = sx / s.ghosts.length;
      this.y = sy / s.ghosts.length;
      this.hasPos = true;
    } else if (s.ghosts.length > 0) {
      // Keep the heuristic position fresh.
      let sx = 0;
      let sy = 0;
      for (const g of s.ghosts) {
        sx += g.x;
        sy += g.y;
      }
      this.x = sx / s.ghosts.length;
      this.y = sy / s.ghosts.length;
    }
  }

  close(): void {
    if (this.sendTimer) clearInterval(this.sendTimer);
    this.sendTimer = null;
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }

  getStatesReceived(): number {
    return this.statesReceived;
  }
}

// `count` bots with distinct, fixed seeds, so every run steers the same way.
export function spawnBots(count: number, base: Omit<BotOptions, 'seed'>): ProbeBot[] {
  return Array.from({ length: count }, (_, i) => new ProbeBot({ ...base, seed: i * 2654435761 }));
}

function toUint8Array(data: RawData): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) {
    const total = data.reduce((n, b) => n + b.byteLength, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const b of data) {
      out.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), o);
      o += b.byteLength;
    }
    return out;
  }
  // Buffer (node): assignable to Uint8Array but TypeScript may not infer it.
  return new Uint8Array(
    (data as Buffer).buffer,
    (data as Buffer).byteOffset,
    (data as Buffer).byteLength,
  );
}
