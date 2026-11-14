// Seasonal Spirits — headless spectator. Connects, feeds the delay queue, runs a 60 Hz
// render loop that calls interpolate() and the jump detector exactly like the browser
// viewer. Produces the measurement numbers the probe report needs.

import WebSocket, { type RawData } from 'ws';
import {
  DelayQueue,
  JumpDetector,
  PerMinuteCounter,
  decodeState,
  interpolate,
  trimBuffer,
  type BufferedState,
} from '@seasonal-spirits/protocol';

export interface SpectatorOptions {
  url: string;
  latencyMinMs: number;
  latencyMaxMs: number;
  bufferMs: number;
  frameHz: number;
  speedUnitsPerSecond: number;
}

export class HeadlessSpectator {
  private readonly opts: SpectatorOptions;
  private readonly ws: WebSocket;
  private readonly inbound: DelayQueue<Uint8Array>;
  private readonly buffer: BufferedState[] = [];
  private frameTimer: NodeJS.Timeout | null = null;
  private statesReceived = 0;
  private statesBytesSum = 0;
  private statesBytesMin = Number.POSITIVE_INFINITY;
  private statesBytesMax = 0;
  private statesPerSecond = new PerMinuteCounter();
  private jumps = new PerMinuteCounter();
  private underruns = new PerMinuteCounter();
  private readonly jumpDetector: JumpDetector;
  private framesRendered = 0;

  constructor(opts: SpectatorOptions) {
    this.opts = opts;
    this.jumpDetector = new JumpDetector({ speedUnitsPerSecond: opts.speedUnitsPerSecond });
    this.inbound = new DelayQueue<Uint8Array>(opts.latencyMinMs, opts.latencyMaxMs, (buf) => {
      const now = Date.now();
      const state = decodeState(buf);
      this.buffer.push({ receivedAt: now, state });
      trimBuffer(this.buffer, now, 2000);
      this.statesReceived++;
      this.statesPerSecond.record(now);
      this.statesBytesSum += buf.byteLength;
      if (buf.byteLength < this.statesBytesMin) this.statesBytesMin = buf.byteLength;
      if (buf.byteLength > this.statesBytesMax) this.statesBytesMax = buf.byteLength;
    });
    this.ws = new WebSocket(opts.url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({ kind: 'spectator' }));
    });
    this.ws.on('message', (data: RawData) => {
      this.inbound.push(rawToUint8Array(data));
    });
    this.ws.on('error', () => {
      // swallowed
    });
    const periodMs = 1000 / opts.frameHz;
    this.frameTimer = setInterval(() => this.renderFrame(), periodMs);
  }

  private renderFrame(): void {
    const now = Date.now();
    const { ghosts, underrun } = interpolate(this.buffer, now, this.opts.bufferMs);
    if (underrun && this.buffer.length > 0) this.underruns.record(now);
    const jumps = this.jumpDetector.observe(now, ghosts);
    if (jumps > 0) this.jumps.record(now, jumps);
    this.framesRendered++;
  }

  close(): void {
    if (this.frameTimer) clearInterval(this.frameTimer);
    this.frameTimer = null;
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }

  summary(): {
    statesReceived: number;
    bytesMin: number;
    bytesAvg: number;
    bytesMax: number;
    jumpsPer60s: number;
    underrunsPer60s: number;
    framesRendered: number;
    statesPerSecondInWindow: number;
  } {
    const now = Date.now();
    const avg = this.statesReceived > 0 ? this.statesBytesSum / this.statesReceived : 0;
    return {
      statesReceived: this.statesReceived,
      bytesMin: Number.isFinite(this.statesBytesMin) ? this.statesBytesMin : 0,
      bytesAvg: Math.round(avg),
      bytesMax: this.statesBytesMax,
      jumpsPer60s: this.jumps.value(now),
      underrunsPer60s: this.underruns.value(now),
      framesRendered: this.framesRendered,
      statesPerSecondInWindow: this.statesPerSecond.value(now) / 60,
    };
  }
}

function rawToUint8Array(data: RawData): Uint8Array {
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
  return new Uint8Array(
    (data as Buffer).buffer,
    (data as Buffer).byteOffset,
    (data as Buffer).byteLength,
  );
}
