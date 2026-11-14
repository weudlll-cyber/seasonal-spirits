// Seasonal Spirits — tick server + WebSocket handler for the empty-map probe.
// Fixed tick rate with drift correction (accumulated time, not a bare setInterval). One
// binary state message per tick to every client. Tracks CPU usage, achieved Hz and max
// tick duration; exposes /metrics-lite as JSON on the same HTTP server.

import http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { encodeState, encodedSize, type ClientMessage } from '@seasonal-spirits/protocol';
import { World } from './world.js';

export interface ServerConfig {
  port: number;
  tickHz: number;
  world: number;
  speed: number;
  maxGhosts: number;
  maxInputsPerSecond: number;
}

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
  inputsThisSecond: number;
  inputWindowStart: number;
}

export class GameServer {
  private readonly cfg: ServerConfig;
  private readonly world: World;
  private http!: http.Server;
  private wss!: WebSocketServer;
  private tickTimer: NodeJS.Timeout | null = null;
  private nextClientId = 1;
  private readonly clients = new Map<number, ClientRecord>();
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
    this.http = http.createServer((req, res) => this.handleHttp(req, res));
    this.wss = new WebSocketServer({ server: this.http });
    this.wss.on('connection', (ws) => this.handleConnection(ws));
    await new Promise<void>((resolve) => this.http.listen(this.cfg.port, resolve));
    this.start();
  }

  async close(): Promise<void> {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    for (const c of this.clients.values()) c.ws.close();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  private start(): void {
    this.startWall = Date.now();
    this.lastTickWall = this.startWall;
    this.world.start(this.startWall);
    this.cpuBaseline = process.cpuUsage();
    this.metricsWindowStart = this.startWall;
    this.ticksInWindow = 0;
    // 1 ms resolution; drift-corrected inside tickLoop.
    this.tickTimer = setInterval(() => this.tickLoop(), 1);
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

  private handleConnection(ws: WebSocket): void {
    if (this.clients.size >= this.cfg.maxGhosts * 2) {
      ws.close();
      return;
    }
    const id = this.nextClientId++;
    const rec: ClientRecord = {
      id,
      kind: 'pending',
      ws,
      inputsThisSecond: 0,
      inputWindowStart: Date.now(),
    };
    this.clients.set(id, rec);
    ws.on('message', (data) => this.handleMessage(rec, data));
    ws.on('close', () => {
      this.clients.delete(id);
      this.world.removeGhost(id);
    });
    ws.on('error', () => {
      this.clients.delete(id);
      this.world.removeGhost(id);
    });
  }

  private handleMessage(rec: ClientRecord, data: unknown): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(data)) as ClientMessage;
    } catch {
      return;
    }
    if (msg.kind === 'player' || msg.kind === 'spectator') {
      if (rec.kind !== 'pending') return;
      if (msg.kind === 'player' && this.world.ghostCount() < this.cfg.maxGhosts) {
        rec.kind = 'player';
        this.world.addGhost(rec.id);
      } else if (msg.kind === 'player') {
        rec.ws.close();
        return;
      } else {
        rec.kind = 'spectator';
      }
      return;
    }
    if (msg.kind === 'input') {
      if (rec.kind !== 'player') return; // spectators and pendings send nothing
      const now = Date.now();
      if (now - rec.inputWindowStart >= 1000) {
        rec.inputWindowStart = now;
        rec.inputsThisSecond = 0;
      }
      if (rec.inputsThisSecond >= this.cfg.maxInputsPerSecond) return;
      rec.inputsThisSecond++;
      if (Number.isFinite(msg.dx) && Number.isFinite(msg.dy)) {
        this.world.setDirection(rec.id, msg.dx, msg.dy);
      }
    }
  }

  private handleHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.url === '/metrics-lite') {
      const m = this.metrics();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(m));
      return;
    }
    res.writeHead(404);
    res.end();
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
    return this.cfg.port;
  }

  clientCount(): number {
    return this.clients.size;
  }
}
