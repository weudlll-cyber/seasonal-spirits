// Seasonal Sumo — the admin settings endpoint (THREATS rows 39, 42): absent without the flag and in
// production, refused from another host or page, only settings that pass the schema applied,
// rate bounded; presets saved, loaded and deleted by name, a stored preset with a bad value
// refused and never applied; a change reaches the running match and every client.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '@seasonal-spirits/game-core';
import { ADMIN_SETTINGS_PATH, parseServerMessage } from '@seasonal-spirits/protocol';
import { AdminSettings, type AdminHead } from './admin-settings.js';
import { rawToText } from './client-record.js';
import { PresetStore } from './presets.js';
import type { GameServer } from './server.js';
import { connect, startServer } from './test-client.js';

const VIEWER = 'http://localhost:5931';
const VALID: Settings = { ...DEFAULT_SETTINGS, maxSpeed: 300, lives: 5, variant: 2 };
const POST: AdminHead = {
  method: 'POST',
  origin: VIEWER,
  remote: '127.0.0.1',
  contentType: 'application/json',
};
const apply = (settings: unknown): string => JSON.stringify({ action: 'apply', settings });
const named = (action: string, name: string): string => JSON.stringify({ action, name });

function endpoint(env: Record<string, string> = {}, now = () => 0) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presets-'));
  const applied: Settings[] = [];
  let current = DEFAULT_SETTINGS;
  const e = new AdminSettings({
    origins: [VIEWER],
    start: DEFAULT_SETTINGS,
    current: () => current,
    apply: (s) => {
      applied.push(s);
      current = s;
    },
    presets: new PresetStore(dir),
    env,
    now,
  });
  return { e, applied, dir };
}

describe('admin settings refusals', () => {
  it('refuses to exist with NODE_ENV=production', () => {
    expect(() => endpoint({ NODE_ENV: 'production' })).toThrow(/development tool/);
  });

  it('answers a caller from another host as if the endpoint did not exist', () => {
    const { e, applied } = endpoint();
    expect(e.answer({ ...POST, remote: '192.168.0.66' }, apply(VALID))).toEqual({ status: 404 });
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

describe('admin settings and presets', () => {
  it('applies valid settings and answers with them, the starting values and the presets', () => {
    const { e, applied } = endpoint();
    expect(e.answer(POST, apply(VALID))).toEqual({
      status: 200,
      body: { current: VALID, start: DEFAULT_SETTINGS, presets: [] },
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
          headers: { origin: VIEWER, 'content-type': 'application/json' },
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

describe('admin settings on the server', () => {
  let server: GameServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  const admin = () => ({
    adminOrigins: [VIEWER],
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
    expect(answer.cors).toBe(VIEWER);
    // At once: the walking speed; the lives wait for the next match.
    await expect
      .poll(() => heard)
      .toContainEqual({ kind: 'tuning', values: { ...base, maxSpeed: 300 } });
    ws.close();
  });
});
