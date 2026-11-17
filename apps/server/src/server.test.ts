// Seasonal Spirits — what a cheating or broken client can try, and the server's answer.
// One test per entry of docs/THREATS.md (server side); the validator's own cases are in
// packages/protocol/src/client-message.test.ts, the game rules in packages/game-core.

import { afterEach, describe, expect, it } from 'vitest';
import { GHOST_BOT } from '@seasonal-spirits/protocol';
import type { GameServer } from './server.js';
import {
  closed,
  connect,
  ghostIn,
  nthState,
  player,
  serverText,
  startServer,
} from './test-client.js';

let server: GameServer | null = null;

afterEach(async () => {
  await server?.close();
  server = null;
});

describe('server under hostile messages', () => {
  it('survives garbage, null, arrays, numbers and wrong types without throwing', async () => {
    server = await startServer();
    const { ws, ghost } = await player(server);
    const before = ghostIn(await nthState(ws, 1), ghost);
    for (const m of [
      'not json',
      'null',
      '[]',
      '42',
      '"input"',
      '{}',
      '{"kind":7}',
      '{"kind":"input"}',
      '{"kind":"input","dx":"1","dy":0}',
      '{"kind":"input","dx":1e400,"dy":0}',
      '{"kind":"input","dx":5,"dy":0}',
      '{"kind":"action","action":"teleport"}',
      '{"__proto__":{"kind":"input"},"dx":1,"dy":0}',
    ]) {
      ws.send(m);
    }
    const after = ghostIn(await nthState(ws, 3), ghost);
    expect(after?.x).toBe(before?.x);
    expect(server.metrics().players).toBe(1);
  });

  it('ignores a position, count or team sent along with an input', async () => {
    server = await startServer();
    const { ws, ghost } = await player(server);
    const before = ghostIn(await nthState(ws, 1), ghost);
    ws.send(JSON.stringify({ kind: 'input', dx: 0, dy: 0, x: 5, y: 5, team: 3, carried: 999 }));
    const after = ghostIn(await nthState(ws, 3), ghost);
    expect({ x: after?.x, y: after?.y, team: after?.team }).toEqual({
      x: before?.x,
      y: before?.y,
      team: before?.team,
    });
  });

  it('ignores binary frames, even a valid input in one', async () => {
    server = await startServer();
    const { ws, ghost } = await player(server);
    const before = ghostIn(await nthState(ws, 1), ghost);
    ws.send(Buffer.from(JSON.stringify({ kind: 'input', dx: 1, dy: 0 })), { binary: true });
    const after = ghostIn(await nthState(ws, 3), ghost);
    expect(after?.x).toBe(before?.x);
  });
});

describe('server message size and rate', () => {
  it('closes a socket that sends a frame above the size bound', async () => {
    server = await startServer();
    const ws = await connect(server);
    ws.send(JSON.stringify({ kind: 'player', pad: 'x'.repeat(1000) }));
    expect(await closed(ws)).toBe(1009);
  });

  it('drops messages above the per-second rate', async () => {
    server = await startServer({ maxInputsPerSecond: 3 });
    const { ws, ghost } = await player(server); // the hello is the 1st message
    ws.send(JSON.stringify({ kind: 'input', dx: 0, dy: 0 }));
    ws.send(JSON.stringify({ kind: 'input', dx: 0, dy: 0 }));
    const before = ghostIn(await nthState(ws, 1), ghost);
    ws.send(JSON.stringify({ kind: 'input', dx: 1, dy: 0 })); // 4th: over the rate
    const after = ghostIn(await nthState(ws, 4), ghost);
    expect(after?.x).toBe(before?.x);
  });
});

describe('server connection rules', () => {
  it('tells a player its ghost, which no bot steers any more', async () => {
    server = await startServer();
    const { ws, ghost } = await player(server);
    const s = await nthState(ws, 1);
    // A missing ghost counts as a bot, so the first check cannot pass by accident.
    expect((ghostIn(s, ghost)?.flags ?? GHOST_BOT) & GHOST_BOT).toBe(0);
    expect(s.ghosts.filter((g) => g.flags & GHOST_BOT)).toHaveLength(3);
  });

  it('keeps a player a player after a second hello', async () => {
    server = await startServer();
    const { ws } = await player(server);
    ws.send(JSON.stringify({ kind: 'spectator' }));
    ws.send(JSON.stringify({ kind: 'player' }));
    await nthState(ws, 2);
    expect(server.metrics().players).toBe(1);
  });

  it('makes a late player a spectator when every slot has one, and closes it if it sends', async () => {
    server = await startServer();
    for (let i = 0; i < 4; i++) await player(server);
    const late = await connect(server);
    const notice = serverText(late);
    late.send(JSON.stringify({ kind: 'player' }));
    expect(await notice).toEqual({ kind: 'spectating', reason: 'full' });
    await nthState(late, 1); // it watches the match
    expect(server.metrics().players).toBe(4);
    late.send(JSON.stringify({ kind: 'input', dx: 1, dy: 0 }));
    expect(await closed(late)).toBe(1008);
  });

  it('closes a spectator that sends anything after its hello', async () => {
    server = await startServer();
    const ws = await connect(server);
    ws.send(JSON.stringify({ kind: 'spectator' }));
    await nthState(ws, 1);
    ws.send(JSON.stringify({ kind: 'input', dx: 1, dy: 0 }));
    expect(await closed(ws)).toBe(1008);
    expect(server.metrics().players).toBe(0);
  });

  it('closes a connection that never says hello', async () => {
    server = await startServer({ helloTimeoutMs: 100 });
    const ws = await connect(server);
    expect(await closed(ws)).toBe(1008);
  });
});

describe('server connection bounds', () => {
  it('leaves nothing behind after rapid reconnects', async () => {
    server = await startServer();
    for (let i = 0; i < 20; i++) {
      const { ws } = await player(server);
      ws.close();
      await closed(ws);
    }
    const last = await player(server);
    expect(server.clientCount()).toBe(1);
    expect(server.metrics().players).toBe(1);
    last.ws.close();
  });

  it('refuses more connections from one address than the bound', async () => {
    server = await startServer({ maxConnectionsPerAddress: 2 });
    await connect(server);
    await connect(server);
    const third = await connect(server);
    expect(await closed(third)).toBe(1008);
  });

  it('refuses connections beyond twice the seat count in total', async () => {
    server = await startServer({ maxConnectionsPerAddress: 20 }); // four seats
    for (let i = 0; i < 8; i++) await connect(server);
    const ninth = await connect(server);
    expect(await closed(ninth)).toBe(1008);
  });
});

describe('/metrics-lite', () => {
  it('answers loopback GET with CORS only in development', async () => {
    server = await startServer({ devCors: false });
    const r = await fetch(`http://127.0.0.1:${server.port()}/metrics-lite`);
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    await server.close();
    server = await startServer({ devCors: true });
    const dev = await fetch(`http://127.0.0.1:${server.port()}/metrics-lite`);
    expect(dev.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('answers 404 to anything but GET /metrics-lite', async () => {
    server = await startServer();
    const base = `http://127.0.0.1:${server.port()}`;
    expect((await fetch(`${base}/metrics-lite`, { method: 'POST' })).status).toBe(404);
    expect((await fetch(`${base}/`)).status).toBe(404);
  });
});
