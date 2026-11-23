// Seasonal Spirits — the match server: 20 Hz loop with drift correction, WebSocket handler,
// /metrics-lite. Every client message passes the shared validator first (docs/THREATS.md).

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { Settings } from '@seasonal-spirits/game-core';
import {
  ADMIN_SETTINGS_PATH,
  MAX_CLIENT_MESSAGE_BYTES,
  encodeState,
  ghostName,
  parseClientMessage,
  type ClientMessage,
  type ServerSpectating,
  type ServerWelcome,
} from '@seasonal-spirits/protocol';
import {
  POLICY_VIOLATION,
  admits,
  pingSweep,
  rawToText,
  sendWithin,
  withinRate,
  type ClientRecord,
} from './client-record.js';
import { handleHttp } from './http-routes.js';
import { MatchHost } from './match-host.js';
import { adminEndpoint, tuningText, type AdminSettings } from './admin-settings.js';
import { ORIGIN_REFUSED, OriginGuard } from './origin-guard.js';
import { TickMetrics, type ServerMetrics } from './tick-metrics.js';
import { stepsDue } from './tick-steps.js';

export interface ServerConfig {
  port: number; // 0 picks a free port (tests); port() reports the bound one
  host: string; // the address to listen on: loopback unless the LAN mode asks for more
  tickHz: number;
  settings: Settings; // every gameplay number, the rotation and the seats (game-core settings.ts)
  maxInputsPerSecond: number; // every message counts, valid or not
  maxConnectionsPerAddress: number;
  maxPendingPerAddress: number; // connections from one address not past their hello yet
  helloTimeoutMs: number; // a connection that has not said hello by then is closed
  pingIntervalMs: number; // the liveness ping (client-record.ts pingSweep)
  gameOrigins: readonly string[]; // the pages the game is served from: no other may connect
  maxBufferedBytes: number; // a client holding more unsent bytes is closed (client-record.ts)
  devCors: boolean; // CORS `*` on /metrics-lite, development only
  firstSeed: number;
  // The admin settings endpoint for these pages (the viewer's panel; DEV_TUNING=1, development
  // only) and its presets' folder; absent or null: no endpoint (admin-settings.ts).
  adminOrigins?: readonly string[] | null;
  adminHomeNetwork?: boolean; // the LAN mode: the admin panel from the home network too
  presetDir?: string;
}

export class GameServer {
  private readonly cfg: ServerConfig;
  private readonly host: MatchHost;
  private readonly admin: AdminSettings | null;
  private readonly origins: OriginGuard;
  private http!: http.Server;
  private wss!: WebSocketServer;
  private tickTimer: NodeJS.Timeout | null = null;
  private nextClientId = 1;
  private readonly clients = new Map<number, ClientRecord>();
  private tickCount = 0;
  private lastTickWall = 0;
  private lastPing = 0;
  private accumulator = 0;
  private stats!: TickMetrics;

  constructor(cfg: ServerConfig) {
    this.cfg = cfg;
    this.host = new MatchHost(cfg.settings, cfg.firstSeed);
    const dir = cfg.presetDir ?? 'presets';
    this.admin = adminEndpoint(cfg.adminOrigins, dir, this.host, cfg.adminHomeNetwork ?? false);
    this.origins = new OriginGuard(cfg.gameOrigins, (line) => {
      console.warn(line);
    });
  }

  async listen(): Promise<void> {
    this.http = http.createServer((req, res) => {
      if (this.admin && req.url === ADMIN_SETTINGS_PATH) this.admin.handle(req, res);
      else handleHttp(req, res, () => this.metrics(), this.cfg.devCors);
    });
    // Frames above the bound are refused by ws itself (close code 1009) before we see them; an
    // upgrade from a page the game is not served from gets 403 before it is a connection.
    this.wss = new WebSocketServer({
      server: this.http,
      maxPayload: MAX_CLIENT_MESSAGE_BYTES,
      verifyClient: (info, done) => {
        done(
          this.origins.allows(info.origin, info.req.socket.remoteAddress ?? 'unknown'),
          ORIGIN_REFUSED,
        );
      },
    });
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
    this.stats = new TickMetrics(Date.now());
    this.lastTickWall = this.stats.startWall;
    this.lastPing = this.stats.startWall;
    // 1 ms resolution; drift-corrected inside tickLoop.
    this.tickTimer = setInterval(() => {
      this.tickLoop();
    }, 1);
  }

  // Drift correction: wall time accumulates, and as many fixed steps run as fit into it, so a
  // late timer callback catches up instead of slowing the match down — up to tick-steps.ts' bound.
  private tickLoop(): void {
    const stepMs = 1000 / this.cfg.tickHz;
    const now = Date.now();
    const due = stepsDue(this.accumulator, now - this.lastTickWall, stepMs);
    this.accumulator = due.carryMs;
    this.lastTickWall = now;
    if (now - this.lastPing >= this.cfg.pingIntervalMs) {
      this.lastPing = now;
      pingSweep(this.clients.values());
    }
    for (let i = 0; i < due.steps; i++) {
      const tickStart = Date.now();
      this.tickCount++;
      const wire = this.host.tick(stepMs);
      const buf = encodeState({
        ...wire,
        tick: this.tickCount,
        serverMs: tickStart - this.stats.startWall,
      });
      this.sendToAll(buf);
      // The settings in force, after a change or at a new match: every client plays by them.
      const rules = this.host.settingsToTell();
      if (rules) this.sendToAll(tuningText(rules));
      // The match recap goes to everyone once, in the tick the match ended (THREATS row 33).
      const recap = this.host.recapNow(true);
      if (recap) this.sendToAll(JSON.stringify(recap));
      this.stats.tick(Date.now() - tickStart, buf.byteLength);
    }
  }

  // Every client past its hello: players and spectators.
  private sendToAll(data: Uint8Array | string): void {
    for (const c of this.clients.values()) {
      if (c.kind === 'pending' || c.ws.readyState !== c.ws.OPEN) continue;
      sendWithin(c.ws, data, this.cfg.maxBufferedBytes);
    }
  }

  private handleConnection(ws: WebSocket, address: string): void {
    const bounds = {
      total: this.host.seats() * 2,
      perAddress: this.cfg.maxConnectionsPerAddress,
      pendingPerAddress: this.cfg.maxPendingPerAddress,
    };
    if (!admits(this.clients.values(), address, bounds)) {
      ws.close(POLICY_VIOLATION);
      return;
    }
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
      answered: true,
    };
    this.clients.set(rec.id, rec);
    ws.on('pong', () => {
      rec.answered = true;
    });
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
    // The settings in force (players predict and draw with them).
    rec.ws.send(tuningText(this.host.settingsInForce()));
    // Arriving during the result pause: the recap of the match just ended.
    const recap = this.host.recapNow(false);
    if (recap) rec.ws.send(JSON.stringify(recap));
  }

  metrics(): ServerMetrics {
    const who = {
      clients: this.clients.size,
      players: this.host.players(),
      ghosts: this.host.seats(),
    };
    return this.stats.snapshot(Date.now(), who);
  }

  resetMetricsWindow(): void {
    this.stats.reset(Date.now());
  }

  port(): number {
    return (this.http.address() as AddressInfo | null)?.port ?? this.cfg.port;
  }

  clientCount(): number {
    return this.clients.size;
  }
}
