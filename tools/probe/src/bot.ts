// Seasonal Spirits — a probe bot. A normal WebSocket player that sends the direction its
// BotPolicy chooses every 50 ms; it knows its own ghost from the welcome message. Outgoing
// and incoming messages pass through the artificial delay queue.

import WebSocket, { type RawData } from 'ws';
import { mulberry32 } from '@seasonal-spirits/game-core';
import {
  DelayQueue,
  decodeState,
  parseServerMessage,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { BotPolicy } from './bot-policy.js';
import { toUint8Array } from './raw.js';

export interface BotOptions {
  url: string;
  worldSize: number;
  latencyMinMs: number;
  latencyMaxMs: number;
  seed: number;
}

const WALL_MARGIN = 50;
const realClock = { now: (): number => Date.now() };

export class ProbeBot {
  private readonly ws: WebSocket;
  private readonly policy: BotPolicy;
  private readonly outbound: DelayQueue<string>;
  private readonly inbound: DelayQueue<Uint8Array>;
  private sendTimer: NodeJS.Timeout | null = null;
  private ghost: number | null = null;
  private x: number | null = null;
  private y: number | null = null;

  constructor(opts: BotOptions) {
    this.policy = new BotPolicy({
      worldSize: opts.worldSize,
      wallMargin: WALL_MARGIN,
      rng: mulberry32(opts.seed),
      clock: realClock,
    });
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
    this.ws.on('message', (data: RawData, isBinary: boolean) => {
      this.onMessage(data, isBinary);
    });
    this.ws.on('error', () => {
      // swallowed; the probe reports clients from the server metrics
    });
  }

  private onOpen(): void {
    this.outbound.push(JSON.stringify({ kind: 'player' }));
    this.sendTimer = setInterval(() => {
      const { dx, dy } = this.policy.tick(this.x, this.y);
      this.outbound.push(JSON.stringify({ kind: 'input', dx, dy }));
    }, 50);
  }

  // State is binary; the one text message is the welcome naming the bot's ghost.
  private onMessage(data: RawData, isBinary: boolean): void {
    const bytes = toUint8Array(data);
    if (isBinary) {
      this.inbound.push(bytes);
      return;
    }
    const welcome = parseServerMessage(new TextDecoder().decode(bytes));
    if (welcome?.kind === 'welcome') this.ghost = welcome.ghost;
  }

  private onState(s: ServerState): void {
    const own = s.ghosts.find((g) => g.id === this.ghost);
    if (!own) return;
    this.x = own.x;
    this.y = own.y;
  }

  close(): void {
    if (this.sendTimer) clearInterval(this.sendTimer);
    this.sendTimer = null;
    this.ws.close();
  }
}

// `count` bots with distinct, fixed seeds, so every run steers the same way.
export function spawnBots(count: number, base: Omit<BotOptions, 'seed'>): ProbeBot[] {
  return Array.from({ length: count }, (_, i) => new ProbeBot({ ...base, seed: i * 2654435761 }));
}
