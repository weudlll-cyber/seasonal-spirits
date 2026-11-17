// Seasonal Sumo — the owner's live tuning channel (THREATS row 39): absent without the flag and in
// production, refused from another host or page, only the four numbers in range applied, rate
// bounded; a change reaches the running match and every client.

import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { parseServerMessage, type Tuning } from '@seasonal-spirits/protocol';
import { rawToText } from './client-record.js';
import type { GameServer } from './server.js';
import { connect, startServer } from './test-client.js';
import { TUNE_PATH, TuningRoute, type TuneHead } from './tuning-route.js';

const VIEWER = 'http://localhost:5931';
const START: Tuning = { arenaRadius: 400, maxSpeed: 240, dashSpeed: 480, knockSpeed: 320 };
const VALID: Tuning = { arenaRadius: 500, maxSpeed: 300, dashSpeed: 600, knockSpeed: 400 };
const POST: TuneHead = {
  method: 'POST',
  origin: VIEWER,
  remote: '127.0.0.1',
  contentType: 'application/json',
};

function route(applied: Tuning[] = [], env: Record<string, string> = {}, now = () => 0) {
  return new TuningRoute({
    origins: [VIEWER],
    start: START,
    apply: (t) => applied.push(t),
    env,
    now,
  });
}

describe('tuning route refusals', () => {
  it('refuses to exist with NODE_ENV=production', () => {
    expect(() => route([], { NODE_ENV: 'production' })).toThrow(/development tool/);
  });

  it('answers a caller from another host as if the channel did not exist', () => {
    const applied: Tuning[] = [];
    const a = route(applied).answer({ ...POST, remote: '192.168.0.66' }, JSON.stringify(VALID));
    expect(a).toEqual({ status: 404 });
    expect(applied).toEqual([]);
  });

  it('refuses another page or no page, and a form post from the viewer', () => {
    const applied: Tuning[] = [];
    const r = route(applied);
    const body = JSON.stringify(VALID);
    expect(r.answer({ ...POST, origin: 'http://evil.example' }, body).status).toBe(403);
    expect(r.answer({ ...POST, origin: undefined }, body).status).toBe(403);
    expect(r.answer({ ...POST, contentType: 'text/plain' }, body).status).toBe(415);
    expect(applied).toEqual([]);
  });

  it('refuses values out of range, not whole, missing, extra keys and broken JSON', () => {
    const applied: Tuning[] = [];
    const r = route(applied);
    for (const body of [
      JSON.stringify({ ...VALID, arenaRadius: 100 }),
      JSON.stringify({ ...VALID, maxSpeed: 481 }),
      JSON.stringify({ ...VALID, knockSpeed: -1 }),
      JSON.stringify({ ...VALID, dashSpeed: 600.5 }),
      JSON.stringify({ ...VALID, dashSpeed: '600' }),
      JSON.stringify({ arenaRadius: 500, maxSpeed: 300, dashSpeed: 600 }),
      JSON.stringify({ ...VALID, friction: 1 }),
      '{"arenaRadius":',
      '',
    ]) {
      expect(r.answer(POST, body).status, body).toBe(400);
    }
    expect(applied).toEqual([]);
    expect(r.inForce()).toEqual(START);
  });
});

describe('tuning route changes', () => {
  it('applies valid values and answers with them and the starting values', () => {
    const applied: Tuning[] = [];
    const r = route(applied);
    expect(r.answer(POST, JSON.stringify(VALID))).toEqual({
      status: 200,
      body: { current: VALID, start: START },
    });
    expect(applied).toEqual([VALID]);
    expect(
      r.answer({ ...POST, method: 'GET', contentType: undefined }, null).body?.current,
    ).toEqual(VALID);
  });

  it('refuses more than 20 changes a second, valid or not', () => {
    let now = 0;
    const applied: Tuning[] = [];
    const r = route(applied, {}, () => now);
    const statuses = Array.from({ length: 25 }, () => r.answer(POST, JSON.stringify(VALID)).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(20);
    expect(statuses.at(-1)).toBe(429);
    now = 1000;
    expect(r.answer(POST, JSON.stringify(VALID)).status).toBe(200);
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
          path: TUNE_PATH,
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

describe('tuning channel on the server', () => {
  let server: GameServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });

  it('does not exist when the server was started without the flag', async () => {
    server = await startServer();
    expect((await request(server, 'GET')).status).toBe(404);
    expect((await request(server, 'POST', JSON.stringify(VALID))).status).toBe(404);
  });

  it('refuses a body above 256 bytes', async () => {
    server = await startServer({ tuningOrigins: [VIEWER] });
    const big = JSON.stringify({ ...VALID, pad: 'x'.repeat(300) });
    expect((await request(server, 'POST', big)).status).toBe(413);
  });

  it('takes a valid change from the viewer and tells every client the numbers in force', async () => {
    server = await startServer({ tuningOrigins: [VIEWER] });
    const ws = await connect(server);
    const heard: unknown[] = [];
    ws.on('message', (data, binary) => {
      if (!binary) heard.push(parseServerMessage(rawToText(data)));
    });
    ws.send(JSON.stringify({ kind: 'player' }));
    const answer = await request(server, 'POST', JSON.stringify(VALID));
    expect(answer.status).toBe(200);
    expect(answer.cors).toBe(VIEWER);
    await expect.poll(() => heard).toContainEqual({ kind: 'tuning', values: VALID });
    ws.close();
  });
});
