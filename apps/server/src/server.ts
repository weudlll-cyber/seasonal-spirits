// Seasonal Spirits — the match server: 20 Hz loop + WebSocket handler + /metrics-lite.
// Fixed tick rate with drift correction (accumulated time, not a bare setInterval); each tick
// advances the match host and sends one binary state message to every client. Every client
// message passes the shared validator first (docs/THREATS.md lists what a client can try).

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { GameConfig, GameMode } from '@seasonal-spirits/game-core';
import {
  MAX_CLIENT_MESSAGE_BYTES,
  encodeState,
  ghostName,
  parseClientMessage,
  type ClientMessage,
  type ServerSpectating,
  type ServerWelcome,
} from '@seasonal-spirits/protocol';
import { rawToText, withinRate, type ClientRecord } from './client-record.js';
import { handleHttp } from './http-routes.js';
import { MatchHost } from './match-host.js';

export interface ServerConfig {
  port: number; // 0 picks a free port (tests); port() reports the bound one
  host: string; // the address to listen on: loopback unless the LAN mode asks for more
  tickHz: number;
  game: GameConfig; // the base: its mode, and the times of its mode
  modes?: readonly GameMode[]; // take turns match by match; the base mode alone when absent
  maxGhosts: number; // slots in a match; bots fill those without a player
  maxInputsPerSecond: number; // every message counts, valid or not
  maxConnectionsPerAddress: number;
  helloTimeoutMs: number; // a connection that has not said hello by then is closed
  devCors: boolean; // CORS `*` on /metrics-lite, development only
  firstSeed: number;
}

// WebSocket close code 1008: policy violation.
const POLICY_VIOLATION = 1008;

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

export class GameServer {
  private readonly cfg: ServerConfig;
  private readonly host: MatchHost;
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
  private stateBytes = 0;
  private maxStateBytes = 0;

  constructor(cfg: ServerConfig) {
    this.cfg = cfg;
    this.host = new MatchHost(cfg.game, cfg.maxGhosts, cfg.firstSeed, cfg.modes);
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
    await new Promise<void>((resolve) => this.http.listen(this.cfg.port, this.cfg.host, resolve));
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
    this.cpuBaseline = process.cpuUsage();
    this.metricsWindowStart = this.startWall;
    this.ticksInWindow = 0;
    // 1 ms resolution; drift-corrected inside tickLoop.
    this.tickTimer = setInterval(() => {
      this.tickLoop();
    }, 1);
  }

  // Drift correction: wall time accumulates, and as many fixed steps run as fit into it, so
  // a late timer callback catches up instead of slowing the match down.
  private tickLoop(): void {
    const stepMs = 1000 / this.cfg.tickHz;
    const now = Date.now();
    this.accumulator += now - this.lastTickWall;
    this.lastTickWall = now;
    while (this.accumulator >= stepMs) {
      const tickStart = Date.now();
      this.tickCount++;
      const wire = this.host.tick(stepMs);
      const buf = encodeState({
        ...wire,
        tick: this.tickCount,
        serverMs: tickStart - this.startWall,
      });
      this.stateBytes = buf.byteLength;
      this.maxStateBytes = Math.max(this.maxStateBytes, buf.byteLength);
      this.sendToAll(buf);
      // The match recap goes to everyone once, in the tick the match ended (THREATS row 33).
      const recap = this.host.recapNow(true);
      if (recap) this.sendToAll(JSON.stringify(recap));
      this.maxTickMs = Math.max(this.maxTickMs, Date.now() - tickStart);
      this.ticksInWindow++;
      this.accumulator -= stepMs;
    }
  }

  // Every client past its hello: players and spectators.
  private sendToAll(data: Uint8Array | string): void {
    for (const c of this.clients.values()) {
      if (c.kind === 'pending' || c.ws.readyState !== c.ws.OPEN) continue;
      if (typeof data === 'string') c.ws.send(data);
      else c.ws.send(data, { binary: true });
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
    const rec: ClientRecord = {
      id: this.nextClientId++,
      kind: 'pending',
      ws,
      address,
      messagesThisSecond: 0,
      messageWindowStart: Date.now(),
      helloTimer: setTimeout(() => {
        if (rec.kind === 'pending') ws.close(POLICY_VIOLATION);
      }, this.cfg.helloTimeoutMs),
    };
    this.clients.set(rec.id, rec);
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
    clearTimeout(rec.helloTimer);
    if (rec.kind === 'player') this.host.leave(rec.id);
    const left = (this.perAddress.get(rec.address) ?? 1) - 1;
    if (left > 0) this.perAddress.set(rec.address, left);
    else this.perAddress.delete(rec.address);
  }

  // Every message counts against the per-second budget, valid or not; the rest is dropped.
  private handleMessage(rec: ClientRecord, data: RawData, isBinary: boolean): void {
    // A spectator sends nothing after its hello; any further message ends the connection.
    if (rec.kind === 'spectator') {
      rec.ws.close(POLICY_VIOLATION);
      return;
    }
    if (!withinRate(rec, this.cfg.maxInputsPerSecond, Date.now()) || isBinary) return;
    const msg = parseClientMessage(rawToText(data));
    if (msg !== null) this.apply(rec, msg);
  }

  // Only a player that has said hello steers or acts; whether an action is allowed is the
  // game core's decision, not this file's.
  private apply(rec: ClientRecord, msg: ClientMessage): void {
    switch (msg.kind) {
      case 'player':
      case 'spectator':
        this.hello(rec, msg.kind);
        return;
      case 'input':
        if (rec.kind === 'player') this.host.steer(rec.id, msg.dx, msg.dy);
        return;
      case 'action':
        if (rec.kind === 'player') this.host.act(rec.id, msg.action);
        return;
    }
  }

  private hello(rec: ClientRecord, kind: 'player' | 'spectator'): void {
    if (rec.kind !== 'pending') return; // the first hello decides
    if (kind === 'spectator') {
      rec.kind = 'spectator';
    } else {
      const slot = this.host.join(rec.id);
      if (slot) {
        rec.kind = 'player';
        const name = ghostName(slot.ghost, false);
        const welcome: ServerWelcome = { kind: 'welcome', ...slot, name };
        rec.ws.send(JSON.stringify(welcome));
      } else {
        // Every slot already has a player: the client watches instead and sends nothing more.
        rec.kind = 'spectator';
        const notice: ServerSpectating = { kind: 'spectating', reason: 'full' };
        rec.ws.send(JSON.stringify(notice));
      }
    }
    // Arriving during the result pause: the recap of the match just ended.
    const recap = this.host.recapNow(false);
    if (recap) rec.ws.send(JSON.stringify(recap));
  }

  metrics(): ServerMetrics {
    const now = Date.now();
    const uptime = now - this.startWall;
    const cpu = process.cpuUsage(this.cpuBaseline);
    const windowMs = now - this.metricsWindowStart;
    return {
      achievedHz: windowMs > 0 ? (this.ticksInWindow * 1000) / windowMs : 0,
      maxTickMs: this.maxTickMs,
      cpuPercentOfOneCore: windowMs > 0 ? ((cpu.user + cpu.system) / 1000 / windowMs) * 100 : 0,
      clients: this.clients.size,
      players: this.host.players(),
      ghosts: this.cfg.maxGhosts,
      stateBytes: this.stateBytes,
      maxStateBytes: this.maxStateBytes,
      startedAtMs: this.startWall,
      uptimeMs: uptime,
    };
  }

  resetMetricsWindow(): void {
    this.metricsWindowStart = Date.now();
    this.ticksInWindow = 0;
    this.maxTickMs = 0;
    this.maxStateBytes = 0;
    this.cpuBaseline = process.cpuUsage();
  }

  port(): number {
    return (this.http.address() as AddressInfo | null)?.port ?? this.cfg.port;
  }

  clientCount(): number {
    return this.clients.size;
  }
}
