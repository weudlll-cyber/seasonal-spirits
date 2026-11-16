// Seasonal Spirits — server text message reader tests: welcome and spectating notice are read,
// anything else is dropped.

import { describe, expect, it } from 'vitest';
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

  it('reads a steal notice with only its known fields', () => {
    const text = '{"kind":"steal","thief":7,"victim":3,"coins":2,"x":5}';
    expect(parseServerMessage(text)).toEqual({ kind: 'steal', thief: 7, victim: 3, coins: 2 });
  });

  it('drops a steal notice with a ghost out of range, no coins, or a thief robbing itself', () => {
    for (const text of [
      '{"kind":"steal","thief":256,"victim":3,"coins":2}',
      '{"kind":"steal","thief":7,"victim":-1,"coins":2}',
      '{"kind":"steal","thief":7,"victim":3,"coins":0}',
      '{"kind":"steal","thief":7,"victim":3,"coins":1.5}',
      '{"kind":"steal","thief":7,"victim":7,"coins":2}',
      '{"kind":"steal","thief":7,"victim":3}',
    ]) {
      expect(parseServerMessage(text), text).toBeNull();
    }
  });

  it('drops a welcome or steal notice longer than 256 characters even with valid fields', () => {
    const padded = `{"kind":"steal","thief":7,"victim":3,"coins":2,"pad":"${'x'.repeat(260)}"}`;
    expect(parseServerMessage(padded)).toBeNull();
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

// The match recap (owner decision 2026-11-16): the result and up to three awards.
describe('parseServerMessage: recap', () => {
  const players = Array.from({ length: 32 }, (_, i) => ({
    ghost: i + 1,
    team: i % 4,
    secured: 20.5,
  }));
  const recap = {
    kind: 'recap',
    teams: [120, 99.5, 0, 33],
    players,
    awards: {
      biggestSteal: { thief: 4, victim: 9, coins: 7 },
      closestSave: { ghost: 2, leftMs: 950 },
      lastSecure: { ghost: 11, value: 12.5 },
    },
  };

  it('reads a full recap of 32 players with its three awards, under the size limit', () => {
    const text = JSON.stringify({ ...recap, extra: 1 });
    expect(parseServerMessage(text)).toEqual(recap);
  });

  it('reads a recap without the awards nobody earned', () => {
    const text = JSON.stringify({ ...recap, awards: { lastSecure: { ghost: 3, value: 1 } } });
    expect(parseServerMessage(text)).toMatchObject({
      awards: { lastSecure: { ghost: 3, value: 1 } },
    });
  });

  it('drops a recap with any field out of type or range, or over the size limit', () => {
    const bad: unknown[] = [
      { ...recap, teams: [1, 2, 3] },
      { ...recap, teams: [1, 2, 3, -1] },
      { ...recap, teams: [1, 2, 3, 0.25] },
      { ...recap, players: [{ ghost: 300, team: 0, secured: 1 }] },
      { ...recap, players: [{ ghost: 1, team: 4, secured: 1 }] },
      { ...recap, players: 'all' },
      { ...recap, awards: null },
      { ...recap, awards: { biggestSteal: { thief: 4, victim: 4, coins: 7 } } },
      { ...recap, awards: { biggestSteal: { thief: 4, victim: 5, coins: 0 } } },
      { ...recap, awards: { closestSave: { ghost: 2, leftMs: -1 } } },
      { ...recap, awards: { lastSecure: { ghost: 2, value: 'a lot' } } },
      { ...recap, players: [...players, ...players, { ghost: 1, team: 0, secured: 0 }] },
      { ...recap, pad: 'x'.repeat(4096) },
    ];
    for (const r of bad)
      expect(parseServerMessage(JSON.stringify(r)), JSON.stringify(r).slice(0, 80)).toBeNull();
  });
});
