// Seasonal Spirits — team signals on the server (owner decision 2026-11-16): only the sender's
// team hears them, one per signalIntervalMs per player, none in the result pause; opponents
// and spectators never receive one (THREATS rows 34, 35). Time is the host's dt.

import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { parseServerMessage, type ServerMessage } from '@seasonal-spirits/protocol';
import type WebSocket from 'ws';
import { MatchHost } from './match-host.js';
import type { GameServer } from './server.js';
import { connect, nthState, player, startServer } from './test-client.js';

let server: GameServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

// Clients 1–5 join 8 slots: teams 0, 1, 2, 3, then 0 again (the fewest players first).
function hostWithFive(): { host: MatchHost; teams: Map<number, number> } {
  const host = new MatchHost(DEFAULT_CONFIG, 8, 1);
  const teams = new Map<number, number>();
  for (const client of [1, 2, 3, 4, 5]) teams.set(client, host.join(client)?.team ?? -1);
  host.tick(50);
  return { host, teams };
}

describe('team signals in the match host', () => {
  it('go to the players of the sender’s team only, the sender included', () => {
    const { host, teams } = hostWithFive();
    expect(teams.get(5)).toBe(teams.get(1));
    const out = host.signal(1, 'attack');
    expect(out.map((d) => d.clientId).sort()).toEqual([1, 5]);
    expect(out[0]?.message).toMatchObject({ kind: 'signal', signal: 'attack' });
  });

  it('let one through per signal interval and drop the rest silently', () => {
    const { host } = hostWithFive();
    expect(host.signal(1, 'attack')).toHaveLength(2);
    expect(host.signal(1, 'home')).toEqual([]);
    for (let t = 50; t < DEFAULT_CONFIG.signalIntervalMs; t += 50) host.tick(50);
    expect(host.signal(1, 'home')).toEqual([]); // 1950 ms later: still too soon
    host.tick(50);
    expect(host.signal(1, 'home')).toHaveLength(2);
    expect(host.signal(5, 'home')).toHaveLength(2); // each player has its own interval
  });

  it('carry nothing from a client that steers no ghost, or during the result pause', () => {
    const { host } = hostWithFive();
    expect(host.signal(99, 'attack')).toEqual([]);
    const short = new MatchHost({ ...DEFAULT_CONFIG, matchDurationMs: 100 }, 8, 1);
    short.join(1);
    short.tick(50);
    short.tick(50); // the match ends: the result pause begins
    expect(short.signal(1, 'attack')).toEqual([]);
  });
});

// Every valid text message a socket receives while `ticks` states arrive, read as a client
// reads them (the shared reader).
function textsDuring(ws: WebSocket, ticks: number): Promise<ServerMessage[]> {
  const seen: ServerMessage[] = [];
  const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
    const msg = isBinary ? null : parseServerMessage((data as Buffer).toString('utf8'));
    if (msg) seen.push(msg);
  };
  ws.on('message', onMessage);
  return nthState(ws, ticks).then(() => {
    ws.off('message', onMessage);
    return seen;
  });
}

describe('team signals on the wire', () => {
  it('reach a teammate, never an opponent or a spectator', async () => {
    server = await startServer({ maxGhosts: 8 });
    const sender = await player(server);
    const opponent = await player(server);
    await player(server);
    await player(server);
    const mate = await player(server);
    const watcher = await connect(server);
    watcher.send(JSON.stringify({ kind: 'spectator' }));
    await nthState(watcher, 1);
    const [toMate, toOpponent, toWatcher] = [
      textsDuring(mate.ws, 4),
      textsDuring(opponent.ws, 4),
      textsDuring(watcher, 4),
    ];
    sender.ws.send(JSON.stringify({ kind: 'signal', signal: 'home' }));
    expect((await toMate).filter((m) => m.kind === 'signal')).toEqual([
      expect.objectContaining({ kind: 'signal', ghost: sender.ghost, signal: 'home' }),
    ]);
    expect((await toOpponent).filter((m) => m.kind === 'signal')).toEqual([]);
    expect((await toWatcher).filter((m) => m.kind === 'signal')).toEqual([]);
  });
});
