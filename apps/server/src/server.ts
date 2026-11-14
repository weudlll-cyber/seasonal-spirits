// Seasonal Spirits — tick server + WebSocket handler for the empty-map probe.
// Fixed tick rate with drift correction (accumulated time, not a bare setInterval). One
// binary state message per tick to every client. Tracks CPU usage, achieved Hz and max
// tick duration; exposes /metrics-lite as JSON on the same HTTP server. Every client message
// passes the shared validator first (docs/THREATS.md lists what a client can try).

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import {
  MAX_CLIENT_MESSAGE_BYTES,
  encodeState,
  encodedSize,
  parseClientMessage,
  type ClientHello,
  type ClientInput,
} from '@seasonal-spirits/protocol';
import { handleHttp } from './http-routes.js';
import { World } from './world.js';

export interface ServerConfig {
  port: number; // 0 picks a free port (tests); port() reports the bound one
  tickHz: number;
  world: number;
  speed: number;
  maxGhosts: number;
  maxInputsPerSecond: number; // every message counts, valid or not
  maxConnectionsPerAddress: number;
  devCors: boolean; // CORS `*` on /metrics-lite, development only
}

// WebSocket close code 1008: policy violation.
const POLICY_VIOLATION = 1008;

export interface ServerMetrics {
  achievedHz: number; // computed over the recent window
  maxTickMs: number;
  cpuPercentOfOneCore: number;
  clients: number;
  ghosts: number;
  stateBytes: number;
  startedAtMs: number;
  uptimeMs: number;
}

interface ClientRecord {
  id: number;
  kind: 'player' | 'spectator' | 'pending';
  ws: WebSocket;
  address: string;
  messagesThisSecond: number;
  messageWindowStart: number;
}

export class GameServer {
  private readonly cfg: ServerConfig;
  private readonly world: World;
  private http!: http.Server;
  private wss!: WebSocketServer;
  private tickTimer: NodeJS.Timeout | null = null;
  private nextClientId = 1;
  private readonly clients = new Map<number, ClientRecord>();
  private readonly perAddress = new Map<string, number>();
  private tickCount = 0;
  private maxTickMs = 0;
  private lastTickWall = 0;
  private accumulator = 0;
  private startWall = 0;
  private cpuBaseline: NodeJS.CpuUsage = { user: 0, system: 0 };
  private metricsWindowStart = 0;
  private ticksInWindow = 0;

  constructor(cfg: ServerConfig) {
    this.cfg = cfg;
    this.world = new World({ size: cfg.world, speed: cfg.speed });
  }

  async listen(): Promise<void> {
    this.http = http.createServer((req, res) => {
      handleHttp(req, res, () => this.metrics(), this.cfg.devCors);
    });
    // Frames above the bound are refused by ws itself (close code 1009) before we see them.
    this.wss = new WebSocketServer({ server: this.http, maxPayload: MAX_CLIENT_MESSAGE_BYTES });
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req.socket.remoteAddress ?? 'unknown');
    });
    await new Promise<void>((resolve) => this.http.listen(this.cfg.port, resolve));
    this.start();
  }

  async close(): Promise<void> {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    for (const c of this.clients.values()) c.ws.close();
    await new Promise<void>((resolve) => {
      this.wss.close(() => {
        resolve();
      });
    });
    await new Promise<void>((resolve) =>
      this.http.close(() => {
        resolve();
      }),
    );
  }

  private start(): void {
    this.startWall = Date.now();
    this.lastTickWall = this.startWall;
    this.world.start(this.startWall);
    this.cpuBaseline = process.cpuUsage();
    this.metricsWindowStart = this.startWall;
    this.ticksInWindow = 0;
    // 1 ms resolution; drift-corrected inside tickLoop.
    this.tickTimer = setInterval(() => {
      this.tickLoop();
    }, 1);
  }

  private tickLoop(): void {
    const stepMs = 1000 / this.cfg.tickHz;
    const now = Date.now();
    const elapsed = now - this.lastTickWall;
    this.lastTickWall = now;
    this.accumulator += elapsed;
    while (this.accumulator >= stepMs) {
      const tickStart = Date.now();
      const state = this.world.advance(stepMs, tickStart);
      const buf = encodeState(state);
      for (const c of this.clients.values()) {
        if (c.kind === 'pending') continue;
        if (c.ws.readyState === c.ws.OPEN) {
          c.ws.send(buf, { binary: true });
        }
      }
      const dur = Date.now() - tickStart;
      if (dur > this.maxTickMs) this.maxTickMs = dur;
      this.tickCount++;
      this.ticksInWindow++;
      this.accumulator -= stepMs;
    }
  }

  private handleConnection(ws: WebSocket, address: string): void {
    const fromAddress = this.perAddress.get(address) ?? 0;
    if (
      this.clients.size >= this.cfg.maxGhosts * 2 ||
      fromAddress >= this.cfg.maxConnectionsPerAddress
    ) {
      ws.close(POLICY_VIOLATION);
      return;
    }
    this.perAddress.set(address, fromAddress + 1);
    const id = this.nextClientId++;
    const rec: ClientRecord = {
      id,
      kind: 'pending',
      ws,
      address,
      messagesThisSecond: 0,
      messageWindowStart: Date.now(),
    };
    this.clients.set(id, rec);
    ws.on('message', (data, isBinary) => {
      this.handleMessage(rec, data, isBinary);
    });
    ws.on('close', () => {
      this.drop(rec);
    });
    ws.on('error', () => {
      this.drop(rec);
    });
  }

  // Idempotent: 'error' and 'close' may both fire for one socket.
  private drop(rec: ClientRecord): void {
    if (!this.clients.delete(rec.id)) return;
    this.world.removeGhost(rec.id);
    const left = (this.perAddress.get(rec.address) ?? 1) - 1;
    if (left > 0) this.perAddress.set(rec.address, left);
    else this.perAddress.delete(rec.address);
  }

  private handleMessage(rec: ClientRecord, data: RawData, isBinary: boolean): void {
    // A spectator sends nothing after its hello; any further message ends the connection.
    if (rec.kind === 'spectator') {
      rec.ws.close(POLICY_VIOLATION);
      return;
    }
    if (!this.withinRate(rec) || isBinary) return;
    const msg = parseClientMessage(rawToText(data));
    if (msg === null) return;
    if (msg.kind === 'input') this.handleInput(rec, msg);
    else this.handleHello(rec, msg.kind);
  }

  // Every message counts against the per-second budget, valid or not; the rest is dropped.
  private withinRate(rec: ClientRecord): boolean {
    const now = Date.now();
    if (now - rec.messageWindowStart >= 1000) {
      rec.messageWindowStart = now;
      rec.messagesThisSecond = 0;
    }
    rec.messagesThisSecond++;
    return rec.messagesThisSecond <= this.cfg.maxInputsPerSecond;
  }

  private handleHello(rec: ClientRecord, kind: ClientHello['kind']): void {
    if (rec.kind !== 'pending') return;
    if (kind === 'spectator') {
      rec.kind = 'spectator';
    } else if (this.world.ghostCount() < this.cfg.maxGhosts) {
      rec.kind = 'player';
      this.world.addGhost(rec.id);
    } else {
      rec.ws.close();
    }
  }

  private handleInput(rec: ClientRecord, msg: ClientInput): void {
    if (rec.kind !== 'player') return; // a pending client has not said hello yet
    this.world.setDirection(rec.id, msg.dx, msg.dy);
  }

  metrics(): ServerMetrics {
    const now = Date.now();
    const uptime = now - this.startWall;
    const cpu = process.cpuUsage(this.cpuBaseline);
    const totalUs = cpu.user + cpu.system;
    const pct = uptime > 0 ? (totalUs / 1000 / uptime) * 100 : 0;
    const windowMs = now - this.metricsWindowStart;
    const achievedHz = windowMs > 0 ? (this.ticksInWindow * 1000) / windowMs : 0;
    const ghosts = this.world.ghostCount();
    return {
      achievedHz,
      maxTickMs: this.maxTickMs,
      cpuPercentOfOneCore: pct,
      clients: this.clients.size,
      ghosts,
      stateBytes: encodedSize(ghosts),
      startedAtMs: this.startWall,
      uptimeMs: uptime,
    };
  }

  resetMetricsWindow(): void {
    this.metricsWindowStart = Date.now();
    this.ticksInWindow = 0;
    this.maxTickMs = 0;
    this.cpuBaseline = process.cpuUsage();
  }

  port(): number {
    return (this.http.address() as AddressInfo | null)?.port ?? this.cfg.port;
  }

  clientCount(): number {
    return this.clients.size;
  }
}

function rawToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}
