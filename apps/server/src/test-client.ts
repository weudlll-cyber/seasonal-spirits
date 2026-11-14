// Seasonal Spirits — a raw WebSocket client for the server tests (test-only).
// Waits on socket events (open, close, the n-th state message), never on fixed sleeps.

import WebSocket from 'ws';
import { decodeState, type ServerState } from '@seasonal-spirits/protocol';
import { GameServer, type ServerConfig } from './server.js';

export const TEST_CONFIG: ServerConfig = {
  port: 0,
  tickHz: 20,
  world: 2000,
  speed: 300,
  maxGhosts: 4,
  maxInputsPerSecond: 20,
  maxConnectionsPerAddress: 6,
  devCors: true,
};

export async function startServer(over: Partial<ServerConfig> = {}): Promise<GameServer> {
  const server = new GameServer({ ...TEST_CONFIG, ...over });
  await server.listen();
  return server;
}

export function connect(server: GameServer): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${server.port()}`);
  return new Promise((resolve, reject) => {
    ws.once('open', () => {
      resolve(ws);
    });
    ws.once('error', reject);
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
    const onMessage = (data: WebSocket.RawData): void => {
      seen++;
      if (seen < n) return;
      ws.off('message', onMessage);
      resolve(decodeState(new Uint8Array(data as Buffer)));
    };
    ws.on('message', onMessage);
  });
}

export async function player(server: GameServer): Promise<WebSocket> {
  const ws = await connect(server);
  ws.send(JSON.stringify({ kind: 'player' }));
  await nthState(ws, 1);
  return ws;
}
