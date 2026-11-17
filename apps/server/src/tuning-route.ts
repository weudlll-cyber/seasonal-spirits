// Seasonal Sumo — the owner's live tuning channel (TUNE 2026-11-17, development only): GET and
// POST /dev/tune for the viewer's sliders. The server creates it only when started with
// DEV_TUNING=1 (`pnpm dev`), and it refuses to exist with NODE_ENV=production. It answers
// loopback callers from the viewer's page only and takes nothing but the eleven numbers, each in
// its range (protocol readTuning); the player message validator never sees it (THREATS row 39).

import type http from 'node:http';
import { tuningOf, type GameConfig } from '@seasonal-spirits/game-core';
import { readTuning, type ServerTuning, type Tuning } from '@seasonal-spirits/protocol';
import { refuseProduction, type Env } from './env.js';
import { isLoopback } from './http-routes.js';

export const TUNE_PATH = '/dev/tune';
const MAX_BODY_BYTES = 256; // the eleven numbers as JSON take under 200
// The viewer sends a slider's value at most every 100 ms; a burst above this is refused.
const MAX_CHANGES_PER_SECOND = 20;

export interface TuningOptions {
  origins: readonly string[]; // the viewer's page: no other page may call
  start: Tuning; // the starting values, for Reset
  apply: (t: Tuning) => void;
  env: Env;
  now?: () => number; // the clock of the rate limit
}

// A request as the route judges it, before its body is read.
export interface TuneHead {
  method: string;
  origin: string | undefined;
  remote: string | undefined;
  contentType: string | undefined;
}

export interface TuneAnswer {
  status: number;
  body?: { current: Tuning; start: Tuning };
}

// The channel of a server: null without the viewer's origins (no DEV_TUNING); it starts from the
// game's own numbers.
export function tuningRoute(
  origins: readonly string[] | null | undefined,
  game: GameConfig,
  apply: (t: Tuning) => void,
): TuningRoute | null {
  if (!origins) return null;
  return new TuningRoute({ origins, start: tuningOf(game), apply, env: process.env });
}

// The text every client gets: the numbers in force.
export function tuningText(values: Tuning): string {
  const m: ServerTuning = { kind: 'tuning', values };
  return JSON.stringify(m);
}

export class TuningRoute {
  private readonly o: TuningOptions;
  private readonly now: () => number;
  private current: Tuning;
  private windowStart = -Infinity;
  private changes = 0;

  constructor(o: TuningOptions) {
    refuseProduction(o.env, 'The live tuning channel');
    this.o = o;
    this.now = o.now ?? Date.now;
    this.current = { ...o.start };
  }

  // The numbers in force now.
  inForce(): Tuning {
    return { ...this.current };
  }

  // The whole decision for a request and its body (null when none was read).
  answer(head: TuneHead, body: string | null): TuneAnswer {
    return this.before(head) ?? this.post(body);
  }

  // HTTP: decides what it can before reading; reads a POST's body up to MAX_BODY_BYTES (above:
  // 413 and the connection closes); CORS headers for the viewer's origin only.
  handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const head: TuneHead = {
      method: req.method ?? '',
      origin: req.headers.origin,
      remote: req.socket.remoteAddress,
      contentType: req.headers['content-type'],
    };
    const early = this.before(head);
    if (early) {
      this.send(res, head, early);
      return;
    }
    let body = '';
    let over = false;
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      if (over) return;
      body += chunk;
      if (Buffer.byteLength(body) <= MAX_BODY_BYTES) return;
      over = true;
      res.setHeader('connection', 'close');
      this.send(res, head, { status: 413 });
      res.on('finish', () => req.destroy());
    });
    req.on('end', () => {
      if (!over) this.send(res, head, this.post(body));
    });
  }

  // A refusal, or the answer to OPTIONS and GET; null: a POST from the viewer worth reading.
  private before(head: TuneHead): TuneAnswer | null {
    if (!isLoopback(head.remote)) return { status: 404 }; // as if it did not exist
    if (head.origin === undefined || !this.o.origins.includes(head.origin)) return { status: 403 };
    if (head.method === 'OPTIONS') return { status: 204 };
    if (head.method === 'GET') return { status: 200, body: this.values() };
    if (head.method !== 'POST') return { status: 405 };
    // JSON only: another page's plain form post would not even get here without the browser's
    // preflight, which only the viewer's origin passes.
    if (!head.contentType?.startsWith('application/json')) return { status: 415 };
    return null;
  }

  // Every POST counts against the rate, valid or not; only the eleven numbers in range apply.
  private post(body: string | null): TuneAnswer {
    if (!this.withinRate()) return { status: 429 };
    let value: unknown;
    try {
      value = JSON.parse(body ?? '');
    } catch {
      return { status: 400 };
    }
    const t = readTuning(value);
    if (!t) return { status: 400 };
    this.current = t;
    this.o.apply(t);
    return { status: 200, body: this.values() };
  }

  private values(): { current: Tuning; start: Tuning } {
    return { current: this.inForce(), start: { ...this.o.start } };
  }

  private withinRate(): boolean {
    const now = this.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.changes = 0;
    }
    this.changes++;
    return this.changes <= MAX_CHANGES_PER_SECOND;
  }

  private send(res: http.ServerResponse, head: TuneHead, a: TuneAnswer): void {
    const headers: http.OutgoingHttpHeaders = { vary: 'Origin' };
    // A caller off the machine sees no trace of the channel.
    if (a.status !== 404 && head.origin !== undefined && this.o.origins.includes(head.origin)) {
      headers['access-control-allow-origin'] = head.origin;
      headers['access-control-allow-methods'] = 'GET, POST';
      headers['access-control-allow-headers'] = 'content-type';
    }
    if (a.body) headers['content-type'] = 'application/json';
    res.writeHead(a.status, headers);
    res.end(a.body ? JSON.stringify(a.body) : undefined);
  }
}
