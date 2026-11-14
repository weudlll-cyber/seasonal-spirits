// Seasonal Spirits — a raw WebSocket client for the server tests (test-only).
// Waits on socket events (open, close, the n-th state message), never on fixed sleeps.

import WebSocket from 'ws';
import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import {
  decodeState,
  parseServerMessage,
  type ServerState,
  type ServerWelcome,
} from '@seasonal-spirits/protocol';
import { GameServer, type ServerConfig } from './server.js';

// Four slots; a left player's slot goes back to a bot on the next tick.
export const TEST_CONFIG: ServerConfig = {
  port: 0,
  tickHz: 20,
  game: { ...DEFAULT_CONFIG, reconnectGraceMs: 0 },
  maxGhosts: 4,
  maxInputsPerSecond: 20,
  maxConnectionsPerAddress: 6,
  helloTimeoutMs: 10_000,
  devCors: true,
  firstSeed: 1,
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
    const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
      if (!isBinary || ++seen < n) return;
      ws.off('message', onMessage);
      resolve(decodeState(new Uint8Array(data as Buffer)));
    };
    ws.on('message', onMessage);
  });
}

function welcome(ws: WebSocket): Promise<ServerWelcome> {
  return new Promise((resolve) => {
    const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
      const greeting = isBinary ? null : parseServerMessage((data as Buffer).toString('utf8'));
      if (!greeting) return;
      ws.off('message', onMessage);
      resolve(greeting);
    };
    ws.on('message', onMessage);
  });
}

// A connected player and the ghost it steers, after its first state message.
export async function player(server: GameServer): Promise<{ ws: WebSocket; ghost: number }> {
  const ws = await connect(server);
  const greeting = welcome(ws);
  ws.send(JSON.stringify({ kind: 'player' }));
  const { ghost } = await greeting;
  await nthState(ws, 1);
  return { ws, ghost };
}

export function ghostIn(s: ServerState, id: number): ServerState['ghosts'][number] | undefined {
  return s.ghosts.find((g) => g.id === id);
}
