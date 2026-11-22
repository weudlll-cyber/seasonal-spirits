// Seasonal Spirits — a raw WebSocket client for the server tests (test-only).
// Waits on socket events (open, close, the n-th state message), never on fixed sleeps.

import WebSocket from 'ws';
import { DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import {
  decodeState,
  parseServerMessage,
  type ServerMessage,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { GameServer, type ServerConfig } from './server.js';

// The page the tests' clients name; a raw ws client sends no Origin unless told.
const TEST_ORIGIN = 'http://localhost:5930';

// Four seats; a left player's seat goes back to a bot on the next tick.
const TEST_CONFIG: ServerConfig = {
  port: 0,
  host: '127.0.0.1',
  tickHz: 20,
  settings: { ...DEFAULT_SETTINGS, teamSize: 1, reconnectGrace: 0 },
  maxInputsPerSecond: 20,
  maxConnectionsPerAddress: 6,
  helloTimeoutMs: 10_000,
  gameOrigins: [TEST_ORIGIN],
  maxBufferedBytes: 262_144,
  devCors: true,
  firstSeed: 1,
};

export async function startServer(over: Partial<ServerConfig> = {}): Promise<GameServer> {
  const server = new GameServer({ ...TEST_CONFIG, ...over });
  await server.listen();
  return server;
}

// `origin` null: an upgrade without an Origin header, as a program sends it.
function open(server: GameServer, origin: string | null): WebSocket {
  const url = `ws://127.0.0.1:${server.port()}`;
  return origin === null ? new WebSocket(url) : new WebSocket(url, { origin });
}

export function connect(server: GameServer): Promise<WebSocket> {
  const ws = open(server, TEST_ORIGIN);
  return new Promise((resolve, reject) => {
    ws.once('open', () => {
      resolve(ws);
    });
    ws.once('error', reject);
  });
}

// The HTTP status of an upgrade the server refuses (no socket is opened).
export function refusedStatus(server: GameServer, origin: string | null): Promise<number> {
  const ws = open(server, origin);
  return new Promise((resolve, reject) => {
    // Listening here replaces ws' own handling: the answer is read to its end, no error follows.
    ws.once('unexpected-response', (_req, res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });
    ws.once('error', reject);
    ws.once('open', () => {
      reject(new Error('the upgrade was accepted'));
    });
  });
}

// Resolves with the close code once the server (or the client) closes the socket.
export function closed(ws: WebSocket): Promise<number> {
  if (ws.readyState === WebSocket.CLOSED) return Promise.resolve(1005);
  return new Promise((resolve) => {
    ws.once('close', (code) => {
      resolve(code);
    });
  });
}

// The n-th state message from now on: n ticks of the server have passed.
export function nthState(ws: WebSocket, n: number): Promise<ServerState> {
  return new Promise((resolve) => {
    let seen = 0;
    const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
      if (!isBinary || ++seen < n) return;
      ws.off('message', onMessage);
      resolve(decodeState(new Uint8Array(data as Buffer)));
    };
    ws.on('message', onMessage);
  });
}

// The next valid text message from the server (a welcome or the spectating notice).
export function serverText(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
      const msg = isBinary ? null : parseServerMessage((data as Buffer).toString('utf8'));
      if (!msg) return;
      ws.off('message', onMessage);
      resolve(msg);
    };
    ws.on('message', onMessage);
  });
}

// A connected player and the ghost it steers, after its first state message.
export async function player(server: GameServer): Promise<{ ws: WebSocket; ghost: number }> {
  const ws = await connect(server);
  const greeting = serverText(ws);
  ws.send(JSON.stringify({ kind: 'player' }));
  const msg = await greeting;
  if (msg.kind !== 'welcome') throw new Error('expected a welcome');
  const { ghost } = msg;
  await nthState(ws, 1);
  return { ws, ghost };
}

export function ghostIn(s: ServerState, id: number): ServerState['ghosts'][number] | undefined {
  return s.ghosts.find((g) => g.id === id);
}
