// Seasonal Sumo — the admin settings endpoint (THREATS rows 39, 42): absent without the flag and in
// production, refused from another host or page, only settings that pass the schema applied,
// rate bounded; presets saved, loaded and deleted by name, a stored preset with a bad value
// refused and never applied; a change reaches the running match and every client; the next match
// (the panel rebuild): a game started with its settings, the keep switch, a preset read into the
// draft without applying it.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type RotationSlot, type Settings } from '@seasonal-spirits/game-core';
import { ADMIN_SETTINGS_PATH, parseServerMessage } from '@seasonal-spirits/protocol';
import { AdminSettings, type AdminHead } from './admin-settings.js';
import { rawToText } from './client-record.js';
import { PresetStore } from './presets.js';
import type { GameServer } from './server.js';
import { connect, startServer } from './test-client.js';

const PANEL = 'http://localhost:5930'; // the admin panel's page, /admin/ on the client's address
const VALID: Settings = { ...DEFAULT_SETTINGS, maxSpeed: 300, lives: 5, variant: 2 };
const POST: AdminHead = {
  method: 'POST',
  origin: PANEL,
  remote: '127.0.0.1',
  contentType: 'application/json',
};
const apply = (settings: unknown): string => JSON.stringify({ action: 'apply', settings });
const named = (action: string, name: string): string => JSON.stringify({ action, name });

const PHONE_PAGE = 'http://192.168.1.20:5930'; // the same page on this machine's home address

function endpoint(env: Record<string, string> = {}, now = () => 0, homeNetwork = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-'));
  const applied: Settings[] = [];
  const started: { game: RotationSlot; settings: Settings; keep: boolean }[] = [];
  let current = DEFAULT_SETTINGS;
  let keep = false;
  const e = new AdminSettings({
    origins: homeNetwork ? [PANEL, PHONE_PAGE] : [PANEL],
    homeNetwork,
    current: () => current,
    apply: (s) => {
      applied.push(s);
      current = s;
    },
    start: (game, settings, k) => {
      started.push({ game, settings, keep: k });
      current = settings;
      keep = k;
    },
    keep: (on) => {
      keep = on;
    },
    keeping: () => keep,
    presets: new PresetStore(dir),
    env,
    now,
  });
  return { e, applied, started, dir };
}

describe('admin settings refusals', () => {
  it('refuses to exist with NODE_ENV=production, with or without the home network', () => {
    expect(() => endpoint({ NODE_ENV: 'production' })).toThrow(/development tool/);
    expect(() => endpoint({ NODE_ENV: 'production' }, () => 0, true)).toThrow(/development tool/);
  });

  it('answers a caller from another host as if the endpoint did not exist', () => {
    const { e, applied } = endpoint();
    expect(e.answer({ ...POST, remote: '192.168.1.20' }, apply(VALID))).toEqual({ status: 404 });
    expect(applied).toEqual([]);
  });

  it('refuses another page or no page, and a form post from the panel', () => {
    const { e, applied } = endpoint();
    expect(e.answer({ ...POST, origin: 'http://evil.example' }, apply(VALID)).status).toBe(403);
    expect(e.answer({ ...POST, origin: undefined }, apply(VALID)).status).toBe(403);
    expect(e.answer({ ...POST, contentType: 'text/plain' }, apply(VALID)).status).toBe(415);
    expect(applied).toEqual([]);
  });

  it('refuses settings out of range, off their step, unknown or missing, and broken commands', () => {
    let now = 0; // a request every 100 ms: under the rate limit, however many bodies
    const { e, applied } = endpoint({}, () => (now += 100));
    const rest = Object.fromEntries(Object.entries(VALID).filter(([k]) => k !== 'lives'));
    for (const body of [
      apply({ ...VALID, lives: 10 }),
      apply({ ...VALID, maxSpeed: 305 }), // off its step of 10
      apply({ ...VALID, jump: true }),
      apply({ ...VALID, teleport: 1 }),
      apply(rest),
      JSON.stringify({ action: 'reset' }),
      named('save', 'x'.repeat(40)),
      '{"action":',
      '',
    ]) {
      expect(e.answer(POST, body).status, body.slice(0, 60)).toBe(400);
    }
    expect(applied).toEqual([]);
  });

  it('refuses more than 20 changes a second, valid or not', () => {
    let now = 0;
    const { e } = endpoint({}, () => now);
    const statuses = Array.from({ length: 25 }, () => e.answer(POST, apply(VALID)).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(20);
    expect(statuses.at(-1)).toBe(429);
    now = 1000;
    expect(e.answer(POST, apply(VALID)).status).toBe(200);
  });
});

describe('admin settings from the home network (the LAN mode)', () => {
  const FROM_PHONE: AdminHead = { ...POST, origin: PHONE_PAGE, remote: '::ffff:192.168.1.30' };

  it('takes a phone in the home network on the page at the home address', () => {
    const { e, applied } = endpoint({}, () => 0, true);
    expect(e.answer(FROM_PHONE, apply(VALID)).status).toBe(200);
    expect(applied).toEqual([VALID]);
  });

  it('still refuses a public caller, and another page from the home network', () => {
    const { e, applied } = endpoint({}, () => 0, true);
    expect(e.answer({ ...FROM_PHONE, remote: '8.8.8.8' }, apply(VALID))).toEqual({ status: 404 });
    const other = { ...FROM_PHONE, origin: 'http://192.168.1.30:5930' };
    expect(e.answer(other, apply(VALID))).toEqual({ status: 403 });
    expect(applied).toEqual([]);
  });

  it('refuses the phone without the LAN mode', () => {
    const { e } = endpoint();
    expect(e.answer(FROM_PHONE, apply(VALID))).toEqual({ status: 404 });
  });
});

describe('admin settings and presets', () => {
  it('applies valid settings and answers with them, the presets and the keep switch', () => {
    const { e, applied } = endpoint();
    expect(e.answer(POST, apply(VALID))).toEqual({
      status: 200,
      body: { current: VALID, presets: [], keep: false },
    });
    expect(applied).toEqual([VALID]);
  });

  it('saves the current settings under a name, loads them back, deletes them', () => {
    let now = 0;
    const { e, applied } = endpoint({}, () => (now += 100));
    e.answer(POST, apply(VALID));
    expect(e.answer(POST, named('save', 'fast-dash')).body?.presets).toEqual(['fast-dash']);
    e.answer(POST, apply(DEFAULT_SETTINGS));
    expect(e.answer(POST, named('load', 'fast-dash')).body?.current).toEqual(VALID);
    expect(applied.at(-1)).toEqual(VALID);
    expect(e.answer(POST, named('delete', 'fast-dash')).body?.presets).toEqual([]);
    expect(e.answer(POST, named('load', 'fast-dash')).status).toBe(404);
    expect(e.answer(POST, named('save', 'Bad Name')).status).toBe(400);
  });

  // NIGHT 2026-11-18: a deleted preset's mark kept `pnpm dev` from rotating the modes.
  it('forgets the last loaded preset when it is deleted, not when another one is', () => {
    let now = 0;
    const { e, dir } = endpoint({}, () => (now += 100));
    const mark = path.join(dir, 'last-loaded.txt');
    e.answer(POST, named('save', 'kept'));
    e.answer(POST, named('save', 'gone'));
    e.answer(POST, named('load', 'gone'));
    e.answer(POST, named('delete', 'kept'));
    expect(fs.readFileSync(mark, 'utf8')).toBe('gone');
    e.answer(POST, named('delete', 'gone'));
    expect(fs.existsSync(mark)).toBe(false);
  });

  it('refuses a stored preset with a bad value, and applies nothing of it', () => {
    let now = 0;
    const { e, applied, dir } = endpoint({}, () => (now += 100));
    fs.writeFileSync(path.join(dir, 'broken.json'), JSON.stringify({ ...VALID, lives: 99 }));
    fs.writeFileSync(path.join(dir, 'unknown.json'), JSON.stringify({ ...VALID, teleport: 1 }));
    expect(e.answer(POST, named('load', 'broken')).status).toBe(422);
    expect(e.answer(POST, named('load', 'unknown')).status).toBe(422);
    expect(applied).toEqual([]);
  });
});

// Over HTTP and WebSocket against a real server on a free port.
function request(server: GameServer, method: string, body?: string) {
  return new Promise<{ status: number; text: string; cors: string | undefined }>(
    (resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: server.port(),
          path: ADMIN_SETTINGS_PATH,
          method,
          headers: { origin: PANEL, 'content-type': 'application/json' },
        },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => (text += c));
          res.on('end', () => {
            const cors = res.headers['access-control-allow-origin'];
            resolve({ status: res.statusCode ?? 0, text, cors });
          });
        },
      );
      req.on('error', reject);
      req.end(body);
    },
  );
}

// The panel rebuild (2026-11-18): choose the game, set its values in a draft, start it.
describe('admin next match', () => {
  const start = (game: unknown, settings: unknown, keep: unknown = false): string =>
    JSON.stringify({ action: 'start', game, settings, keep });

  it('starts a startable game with the sent settings and the keep switch', () => {
    const { e, started } = endpoint();
    const answer = e.answer(POST, start('Halving Bomb', VALID, true));
    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ current: VALID, keep: true });
    expect(started).toEqual([
      { game: { mode: 'bomb', variant: 'points' }, settings: VALID, keep: true },
    ]);
  });

  it('refuses an unknown game, invalid settings or a missing keep, and starts nothing', () => {
    let now = 0;
    const { e, started } = endpoint({}, () => (now += 100));
    for (const body of [
      start('Tetris', VALID),
      start('off', VALID), // a rotation slot, but no game
      start('Sumo', VALID), // its variant is a setting, not a choice here
      start('Halving Bomb', { ...VALID, perBomb: 99 }),
      start('Halving Bomb', { ...VALID, unknown: 1 }),
      start('Halving Bomb', VALID, 'yes'),
    ]) {
      expect(e.answer(POST, body).status).toBe(400);
    }
    expect(started).toEqual([]);
  });

  it('refuses a start from another host or page like every other command', () => {
    const { e, started } = endpoint();
    const body = start('King of the Season', VALID);
    expect(e.answer({ ...POST, remote: '192.168.1.20' }, body).status).toBe(404);
    expect(e.answer({ ...POST, origin: 'http://evil.example' }, body).status).toBe(403);
    expect(started).toEqual([]);
  });

  it('switches "keep playing this game" on its own', () => {
    let now = 0;
    const { e } = endpoint({}, () => (now += 100));
    expect(e.answer(POST, JSON.stringify({ action: 'keep', on: true })).body?.keep).toBe(true);
    expect(e.answer(POST, JSON.stringify({ action: 'keep', on: false })).body?.keep).toBe(false);
    expect(e.answer(POST, JSON.stringify({ action: 'keep', on: 1 })).status).toBe(400);
  });

  it('saves the draft as a preset and reads one into the draft without applying it', () => {
    let now = 0;
    const { e, applied } = endpoint({}, () => (now += 100));
    const save = JSON.stringify({ action: 'save', name: 'draft', settings: VALID });
    expect(e.answer(POST, save).body?.presets).toEqual(['draft']);
    const read = e.answer(POST, named('read', 'draft'));
    expect(read.body?.preset).toEqual(VALID);
    expect(read.body?.current).toEqual(DEFAULT_SETTINGS);
    expect(applied).toEqual([]);
    const bad = JSON.stringify({ action: 'save', name: 'x', settings: { ...VALID, lives: 0 } });
    expect(e.answer(POST, bad).status).toBe(400);
  });
});

describe('admin settings on the server', () => {
  let server: GameServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  const admin = () => ({
    adminOrigins: [PANEL],
    presetDir: fs.mkdtempSync(path.join(os.tmpdir(), 'presets-')),
  });

  it('does not exist when the server was started without the flag', async () => {
    server = await startServer();
    expect((await request(server, 'GET')).status).toBe(404);
    expect((await request(server, 'POST', apply(VALID))).status).toBe(404);
  });

  it('refuses a body above 4096 bytes', async () => {
    server = await startServer(admin());
    const big = JSON.stringify({ action: 'apply', settings: VALID, pad: 'x'.repeat(4100) });
    expect((await request(server, 'POST', big)).status).toBe(413);
  });

  it('takes a change from the panel and tells every client the settings in force', async () => {
    server = await startServer(admin());
    const ws = await connect(server);
    const heard: unknown[] = [];
    ws.on('message', (data, binary) => {
      if (!binary) heard.push(parseServerMessage(rawToText(data)));
    });
    ws.send(JSON.stringify({ kind: 'player' }));
    const base = { ...DEFAULT_SETTINGS, teamSize: 1, reconnectGrace: 0 }; // test-client.ts
    const answer = await request(server, 'POST', apply({ ...base, maxSpeed: 300, lives: 5 }));
    expect(answer.status).toBe(200);
    expect(answer.cors).toBe(PANEL);
    // At once: the walking speed; the lives wait for the next match.
    await expect
      .poll(() => heard)
      .toContainEqual({ kind: 'tuning', values: { ...base, maxSpeed: 300 } });
    ws.close();
  });
});
