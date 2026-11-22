// Seasonal Sumo — the game's admin settings endpoint (NIGHT 2026-11-18, piece 3; it grew out of
// TUNE 2026-11-17's /dev/tune): one endpoint, ADMIN_SETTINGS_PATH, for the settings, the named
// presets and the next match (choose a game, its values, start it — the panel rebuild), which the
// admin panel (the viewer's, today) talks to. Access is one check in front of it (adminAccess):
// today the dev flag — the endpoint exists only with DEV_TUNING=1, never with NODE_ENV=production
// — a loopback caller (in the LAN mode also a home-network one, owner 2026-11-21: /admin from the
// phone; home-network.ts) and the panel's page;
// later the game's own admin login, as the sibling games' admin areas have it (BACKLOG OPEN).
// Every value is checked against the game's one schema (game-core readSettings); the player
// message validator never sees any of it (THREATS rows 39, 42).

import type http from 'node:http';
import {
  readSettings,
  startableGame,
  type RotationSlot,
  type Settings,
} from '@seasonal-spirits/game-core';
import type { ServerTuning } from '@seasonal-spirits/protocol';
import { refuseProduction, type Env } from './env.js';
import { isHomeNetwork } from './home-network.js';
import { isLoopback } from './http-routes.js';
import { PresetStore } from './presets.js';

const MAX_BODY_BYTES = 4096; // every setting as JSON takes under 2 KB
// The panel sends a dragged slider at most every 100 ms; a burst above this is refused.
const MAX_CHANGES_PER_SECOND = 20;

export interface AdminOptions {
  origins: readonly string[]; // the admin panel's page: no other page may call
  homeNetwork: boolean; // the LAN mode: callers from the home network too (a phone)
  current: () => Settings; // the settings the next match starts with
  apply: (s: Settings) => void;
  // Ends the running match at once and starts `game` with `settings` (match-host.ts startGame).
  start: (game: RotationSlot, settings: Settings, keep: boolean) => void;
  keep: (on: boolean) => void; // "keep playing this game" on its own
  keeping: () => boolean;
  presets: PresetStore;
  env: Env;
  now?: () => number; // the clock of the rate limit
}

// A request as the endpoint judges it, before its body is read.
export interface AdminHead {
  method: string;
  origin: string | undefined;
  remote: string | undefined;
  contentType: string | undefined;
}

export interface AdminView {
  current: Settings;
  presets: string[];
  keep: boolean; // "keep playing this game" is on
  preset?: Settings; // a preset read into the panel's draft ("read"), nothing applied
}

export interface AdminAnswer {
  status: number;
  body?: AdminView;
}

// The one access check: a refusal's status, or null to go on. Today a loopback caller — in the
// LAN mode also a home-network one (RFC 1918) — (else 404: as if it did not exist) from the admin
// panel's origin (else 403). The game's admin login takes this place before the endpoint leaves
// development.
function adminAccess(
  head: AdminHead,
  origins: readonly string[],
  homeNetwork = false,
): number | null {
  const near = isLoopback(head.remote) || (homeNetwork && isHomeNetwork(head.remote));
  if (!near) return 404;
  if (head.origin === undefined || !origins.includes(head.origin)) return 403;
  return null;
}

// What the endpoint needs of the match host.
export interface AdminHost {
  tune: (s: Settings) => void;
  settingsWanted: () => Settings;
  startGame: (game: RotationSlot, settings: Settings, keep: boolean) => void;
  keepGame: (on: boolean) => void;
  keeping: () => boolean;
}

// The endpoint of a server: null without the panel's origins (no DEV_TUNING). A change goes to
// `host` (the match host), which tells the clients.
export function adminEndpoint(
  origins: readonly string[] | null | undefined,
  presetDir: string,
  host: AdminHost,
  homeNetwork = false,
): AdminSettings | null {
  if (!origins) return null;
  return new AdminSettings({
    origins,
    homeNetwork,
    current: () => host.settingsWanted(),
    apply: (s) => {
      host.tune(s);
    },
    start: (game, s, keep) => {
      host.startGame(game, s, keep);
    },
    keep: (on) => {
      host.keepGame(on);
    },
    keeping: () => host.keeping(),
    presets: new PresetStore(presetDir),
    env: process.env,
  });
}

// The text every client gets: the settings in force (public: the rules everyone plays by).
export function tuningText(values: Settings): string {
  const m: ServerTuning = { kind: 'tuning', values };
  return JSON.stringify(m);
}

// The commands: apply settings to the running match; save the current settings — or the
// panel's draft — as a preset, load one (applied), read one (into the draft only), delete one;
// start a game with its settings; switch "keep playing this game".
type Command =
  | { action: 'apply'; settings: Settings }
  | { action: 'save'; name: string; settings: Settings | null }
  | { action: 'load' | 'read' | 'delete'; name: string }
  | { action: 'start'; game: RotationSlot; settings: Settings; keep: boolean }
  | { action: 'keep'; on: boolean };

type Fields = Record<string, unknown>;
const nameOf = (f: Fields): string | null =>
  typeof f.name === 'string' && f.name.length <= 32 ? f.name : null;
const named =
  (action: 'load' | 'read' | 'delete') =>
  (f: Fields): Command | null => {
    const name = nameOf(f);
    return name === null ? null : { action, name };
  };

// One reader per action, each checking its fields (the settings against the schema, the game
// against the startable games); null for anything else.
const READERS: Record<string, (f: Fields) => Command | null> = {
  apply: (f) => {
    const settings = readSettings(f.settings);
    return settings ? { action: 'apply', settings } : null;
  },
  save: (f) => {
    const name = nameOf(f);
    const draft = f.settings === undefined ? null : readSettings(f.settings);
    if (name === null || (f.settings !== undefined && !draft)) return null;
    return { action: 'save', name, settings: draft };
  },
  load: named('load'),
  read: named('read'),
  delete: named('delete'),
  start: (f) => {
    const game = startableGame(f.game);
    const settings = readSettings(f.settings);
    if (!game || !settings || typeof f.keep !== 'boolean') return null;
    return { action: 'start', game, settings, keep: f.keep };
  },
  keep: (f) => (typeof f.on === 'boolean' ? { action: 'keep', on: f.on } : null),
};

// A POST body: one command; null for anything else.
function readCommand(value: unknown): Command | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const f = value as Fields;
  const read = typeof f.action === 'string' && Object.hasOwn(READERS, f.action);
  return read ? (READERS[f.action as string]?.(f) ?? null) : null;
}

export class AdminSettings {
  private readonly o: AdminOptions;
  private readonly now: () => number;
  private windowStart = -Infinity;
  private changes = 0;

  constructor(o: AdminOptions) {
    refuseProduction(o.env, 'The admin settings endpoint (until the admin login exists)');
    this.o = o;
    this.now = o.now ?? Date.now;
  }

  // The whole decision for a request and its body (null when none was read).
  answer(head: AdminHead, body: string | null): AdminAnswer {
    return this.before(head) ?? this.post(body);
  }

  // HTTP: decides what it can before reading; reads a POST's body up to MAX_BODY_BYTES (above:
  // 413 and the connection closes); CORS headers for the panel's origin only.
  handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const head: AdminHead = {
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

  // A refusal, or the answer to OPTIONS and GET; null: a POST worth reading.
  private before(head: AdminHead): AdminAnswer | null {
    const refused = adminAccess(head, this.o.origins, this.o.homeNetwork);
    if (refused !== null) return { status: refused };
    if (head.method === 'OPTIONS') return { status: 204 };
    if (head.method === 'GET') return { status: 200, body: this.view() };
    if (head.method !== 'POST') return { status: 405 };
    // JSON only: another page's plain form post would not even get here without the browser's
    // preflight, which only the panel's origin passes.
    if (!head.contentType?.startsWith('application/json')) return { status: 415 };
    return null;
  }

  // Every POST counts against the rate, valid or not; nothing invalid is applied or stored.
  private post(body: string | null): AdminAnswer {
    if (!this.withinRate()) return { status: 429 };
    let value: unknown;
    try {
      value = JSON.parse(body ?? '');
    } catch {
      return { status: 400 };
    }
    const c = readCommand(value);
    if (!c) return { status: 400 };
    if (c.action === 'read' || c.action === 'load') return this.preset(c.action, c.name);
    const status = this.run(c);
    return status === 200 ? { status, body: this.view() } : { status };
  }

  // 200 done; 404 no such preset; 409 the preset folder is full; 400 a bad name.
  private run(c: Exclude<Command, { action: 'read' | 'load' }>): number {
    const { presets } = this.o;
    if (c.action === 'delete') return presets.remove(c.name) ? 200 : 404;
    if (c.action === 'save') {
      const saved = presets.save(c.name, c.settings ?? this.o.current());
      return saved.ok ? 200 : saved.reason === 'full' ? 409 : 400;
    }
    if (c.action === 'apply') this.o.apply(c.settings);
    if (c.action === 'start') this.o.start(c.game, c.settings, c.keep);
    if (c.action === 'keep') this.o.keep(c.on);
    return 200;
  }

  // A stored preset, checked against the schema (404 unknown, 422 invalid — nothing of it used):
  // "load" applies it to the running match, "read" only hands it to the panel's draft.
  private preset(action: 'read' | 'load', name: string): AdminAnswer {
    const loaded = this.o.presets.load(name);
    if (!loaded.ok) return { status: loaded.reason === 'unknown' ? 404 : 422 };
    if (action === 'load') this.o.apply(loaded.settings);
    return { status: 200, body: { ...this.view(), preset: loaded.settings } };
  }

  private view(): AdminView {
    return { current: this.o.current(), presets: this.o.presets.list(), keep: this.o.keeping() };
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

  private send(res: http.ServerResponse, head: AdminHead, a: AdminAnswer): void {
    const headers: http.OutgoingHttpHeaders = { vary: 'Origin' };
    // A caller it does not take (404) or another page gets no CORS header for the endpoint.
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
