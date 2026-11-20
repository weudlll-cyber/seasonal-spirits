// Seasonal Spirits — server text message reader tests: welcome, spectating notice and live tuning
// are read, anything else is dropped.

import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import { parseServerMessage } from './server-message.js';

describe('parseServerMessage', () => {
  it('reads a welcome with only its known fields', () => {
    const text = JSON.stringify({ kind: 'welcome', ghost: 7, team: 3, name: 'Player 7', x: 1 });
    expect(parseServerMessage(text)).toEqual({
      kind: 'welcome',
      ghost: 7,
      team: 3,
      name: 'Player 7',
    });
  });

  it('reads the notice that the client watches because every slot has a player', () => {
    expect(parseServerMessage('{"kind":"spectating","reason":"full"}')).toEqual({
      kind: 'spectating',
      reason: 'full',
    });
  });

  it('drops a welcome longer than 256 characters even with valid fields', () => {
    const padded = `{"kind":"welcome","ghost":7,"team":3,"name":"a","pad":"${'x'.repeat(260)}"}`;
    expect(parseServerMessage(padded)).toBeNull();
  });
});

// The settings in force reach the clients (NIGHT 2026-11-18: every setting, read against the
// game's one schema); a forged message is checked like any frame.
describe('parseServerMessage: the settings in force', () => {
  it('reads every setting, each in its range and on its step, and nothing else', () => {
    const values = { ...DEFAULT_SETTINGS, lives: 5, variant: 2 };
    expect(parseServerMessage(JSON.stringify({ kind: 'tuning', values }))).toEqual({
      kind: 'tuning',
      values,
    });
    for (const bad of [
      { ...values, arenaRadius: 5000 },
      { ...values, maxSpeed: 0 },
      { ...values, dashSpeed: 480.5 },
      { ...values, lives: 10 },
      { ...values, variant: 3 },
      { ...values, afterLast: 'keep-halving' },
      { ...values, halvingEvery: 20 },
      { ...values, jump: 2 },
      { ...values, jumpCooldown: 5.1 },
      { ...values, extra: 1 },
      { arenaRadius: 400, maxSpeed: 240, dashSpeed: 480 },
      null,
    ]) {
      expect(parseServerMessage(JSON.stringify({ kind: 'tuning', values: bad }))).toBeNull();
    }
  });
});

describe('parseServerMessage: removed and broken messages', () => {
  // Seasonal Spirits' steal notices and team signals do not exist any more.
  it('drops the removed steal notice and team signal', () => {
    for (const text of [
      '{"kind":"steal","thief":7,"victim":3,"coins":2}',
      '{"kind":"signal","ghost":5,"signal":"home","x":120,"y":1800}',
    ]) {
      expect(parseServerMessage(text), text).toBeNull();
    }
  });

  it('drops non-JSON, non-objects, other kinds and out-of-range fields', () => {
    for (const text of [
      'nope',
      'null',
      '[1]',
      '{"kind":"other","ghost":1,"team":1,"name":"a"}',
      '{"kind":"welcome","ghost":256,"team":1,"name":"a"}',
      '{"kind":"welcome","ghost":1,"team":4,"name":"a"}',
      '{"kind":"welcome","ghost":1.5,"team":1,"name":"a"}',
      '{"kind":"welcome","ghost":1,"team":1,"name":""}',
      '{"kind":"welcome","ghost":1,"team":1}',
      '{"kind":"spectating","reason":"other"}',
      `{"kind":"welcome","ghost":1,"team":1,"name":"${'x'.repeat(300)}"}`,
    ]) {
      expect(parseServerMessage(text), text).toBeNull();
    }
  });
});

// The match recap: the mode's score per team and player, the ghosts still in and the teams
// knocked out, Last One Standing's winner, and the awards.
describe('parseServerMessage: recap', () => {
  const players = Array.from({ length: 32 }, (_, i) => ({
    ghost: i + 1,
    team: i % 4,
    score: 4,
    outMs: i < 8 ? null : 60_000 + i * 1000, // the first 8 still in, the rest out
  }));
  const recap = {
    kind: 'recap',
    teams: [120, 99, 0, 33],
    left: [3, 0, 1, 0],
    knockedOut: [3, 1],
    winner: 0,
    players,
    awards: [
      { kind: 'last-standing', ghost: 4, value: 0 },
      { kind: 'best-pusher', ghost: 2, value: 9 },
      { kind: 'survivor', ghost: 11, value: 182_000 },
    ],
  };

  it('reads a full recap of 32 players with its awards, under the size limit', () => {
    const text = JSON.stringify({ ...recap, extra: 1 });
    expect(parseServerMessage(text)).toEqual(recap);
  });

  it('reads a recap without the awards nobody earned', () => {
    const text = JSON.stringify({ ...recap, awards: [] });
    expect(parseServerMessage(text)).toMatchObject({ awards: [] });
  });

  it('drops a recap with any field out of type or range, or over the size limit', () => {
    const bad: unknown[] = [
      { ...recap, teams: [1, 2, 3] },
      { ...recap, teams: [1, 2, 3, -1] },
      { ...recap, teams: [1, 2, 3, 0.25] },
      { ...recap, players: [{ ghost: 300, team: 0, score: 1, outMs: null }] },
      { ...recap, players: [{ ghost: 1, team: 4, score: 1, outMs: null }] },
      { ...recap, players: [{ ghost: 1, team: 0, score: 1.5, outMs: null }] },
      { ...recap, players: 'all' },
      { ...recap, awards: null },
      { ...recap, awards: [{ kind: 'survivor', ghost: 2, value: -1 }] },
      { ...recap, awards: [{ kind: 'best-pusher', ghost: 300, value: 2 }] },
      { ...recap, left: [1, 2, 3] },
      { ...recap, knockedOut: [1, 1] },
      { ...recap, knockedOut: [4] },
      { ...recap, knockedOut: 'all' },
      { ...recap, winner: 4 },
      { ...recap, winner: undefined },
      { ...recap, awards: [{ kind: 'survivor', ghost: 2, value: 'long' }] },
      { ...recap, awards: [{ kind: '<b>King</b>', ghost: 2, value: 3 }] },
      { ...recap, awards: Array.from({ length: 9 }, () => recap.awards[0]) },
      { ...recap, players: [...players, ...players, { ghost: 1, team: 0, score: 0, outMs: null }] },
      { ...recap, pad: 'x'.repeat(4096) },
    ];
    for (const r of bad)
      expect(parseServerMessage(JSON.stringify(r)), JSON.stringify(r).slice(0, 80)).toBeNull();
  });
});

// Each player's time out (Last One Standing's players list, owner 2026-11-20): a match time in
// whole ms up to an hour, or null while still in; anything else drops the recap.
describe("parseServerMessage: a player's time out", () => {
  const recap = (outMs: unknown) =>
    JSON.stringify({
      kind: 'recap',
      teams: [0, 0, 0, 0],
      left: [1, 0, 0, 0],
      knockedOut: [],
      winner: 0,
      players: [{ ghost: 1, team: 0, score: 1, outMs }],
      awards: [],
    });

  it('reads a time out or null', () => {
    expect(parseServerMessage(recap(102_000))).toMatchObject({ players: [{ outMs: 102_000 }] });
    expect(parseServerMessage(recap(null))).toMatchObject({ players: [{ outMs: null }] });
  });

  it('drops a recap whose time out is missing, negative, over an hour or not a number', () => {
    for (const bad of [undefined, -5, 3_600_001, 1.5, '1:42'])
      expect(parseServerMessage(recap(bad)), String(bad)).toBeNull();
  });
});
