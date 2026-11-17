// Seasonal Sumo — the match recap on the server: built from the core's result and awards,
// sent once to every client when the match ends, and to a client arriving during the result
// pause; never while a match runs. A 1 s match keeps the real server test short.

import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type MatchResult, type PlayerResult } from '@seasonal-spirits/game-core';
import { STATE_RESULT, parseServerMessage, type ServerRecap } from '@seasonal-spirits/protocol';
import type WebSocket from 'ws';
import { MatchHost } from './match-host.js';
import { recapOf } from './recap.js';
import type { GameServer } from './server.js';
import { connect, nthState, player, startServer } from './test-client.js';

const SHORT = { ...DEFAULT_CONFIG, seasonDurationMs: 250, matchDurationMs: 1000 };

let server: GameServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

function nextRecap(ws: WebSocket): Promise<ServerRecap> {
  return new Promise((resolve) => {
    const onMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
      const msg = isBinary ? null : parseServerMessage((data as Buffer).toString('utf8'));
      if (msg?.kind !== 'recap') return;
      ws.off('message', onMessage);
      resolve(msg);
    };
    ws.on('message', onMessage);
  });
}

const row = (id: number, knockouts: number, longestAliveMs: number): PlayerResult => ({
  id,
  team: 1,
  score: knockouts,
  knockouts,
  falls: 1,
  lives: 2,
  longestAliveMs,
  scoreMs: 0,
  bounces: 0,
  passes: 0,
});

describe('match recap', () => {
  it("carries the scores and the mode's awards, in whole numbers", () => {
    const players = [row(3, 2, 40_000), row(4, 0, 90_400.5)];
    const result: MatchResult = {
      mode: 'sumo',
      variant: 'points',
      players,
      teams: [0, 2, 0, 0],
      left: [0, 2, 0, 0],
      knockedOut: [],
      winner: null,
      lastStanding: null,
    };
    expect(recapOf(result)).toEqual({
      kind: 'recap',
      teams: [0, 2, 0, 0],
      left: [0, 2, 0, 0],
      knockedOut: [],
      winner: null,
      players: [
        { ghost: 3, team: 1, score: 2 },
        { ghost: 4, team: 1, score: 0 },
      ],
      awards: [
        { kind: 'best-pusher', ghost: 3, value: 2 },
        { kind: 'survivor', ghost: 4, value: 90_401 },
      ],
    });
  });

  it('is offered once at the end, during the pause for latecomers, never while a match runs', () => {
    const host = new MatchHost({ ...SHORT, resultPauseMs: 500 }, 8, 1);
    const fresh: number[] = [];
    let duringMatch = 0;
    for (let t = 50; t <= 1600; t += 50) {
      const s = host.tick(50);
      if (host.recapNow(true)) fresh.push(s.matchMs);
      if (!(s.flags & STATE_RESULT) && host.recapNow(false)) duringMatch++;
    }
    expect(fresh).toEqual([1000]);
    expect(duringMatch).toBe(0);
  });

  it('reaches every client at the end, and a spectator who arrives in the pause', async () => {
    server = await startServer({ game: { ...SHORT, resultPauseMs: 3000 } });
    const { ws } = await player(server);
    const recap = await nextRecap(ws);
    expect(recap.players.length).toBe(4);
    expect(recap.teams.reduce((a, b) => a + b, 0)).toBe(
      recap.players.reduce((a, p) => a + p.score, 0),
    );
    const late = await connect(server);
    const latesRecap = nextRecap(late);
    late.send(JSON.stringify({ kind: 'spectator' }));
    expect(await latesRecap).toEqual(recap);
    await nthState(late, 1);
    late.close();
    ws.close();
  });
});
