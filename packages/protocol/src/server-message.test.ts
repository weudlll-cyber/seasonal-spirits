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

  it('drops a welcome longer than 256 characters even with valid fields', () => {
    const padded = `{"kind":"welcome","ghost":7,"team":3,"name":"a","pad":"${'x'.repeat(260)}"}`;
    expect(parseServerMessage(padded)).toBeNull();
  });

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

// The match recap: knockouts per team and player, and the awards.
describe('parseServerMessage: recap', () => {
  const players = Array.from({ length: 32 }, (_, i) => ({
    ghost: i + 1,
    team: i % 4,
    knockouts: 4,
  }));
  const recap = {
    kind: 'recap',
    teams: [120, 99, 0, 33],
    players,
    awards: {
      bestPusher: { ghost: 2, knockouts: 9 },
      survivor: { ghost: 11, ms: 182_000 },
    },
  };

  it('reads a full recap of 32 players with its awards, under the size limit', () => {
    const text = JSON.stringify({ ...recap, extra: 1 });
    expect(parseServerMessage(text)).toEqual(recap);
  });

  it('reads a recap without the awards nobody earned', () => {
    const text = JSON.stringify({ ...recap, awards: { survivor: { ghost: 3, ms: 1000 } } });
    expect(parseServerMessage(text)).toMatchObject({
      awards: { survivor: { ghost: 3, ms: 1000 } },
    });
  });

  it('drops a recap with any field out of type or range, or over the size limit', () => {
    const bad: unknown[] = [
      { ...recap, teams: [1, 2, 3] },
      { ...recap, teams: [1, 2, 3, -1] },
      { ...recap, teams: [1, 2, 3, 0.25] },
      { ...recap, players: [{ ghost: 300, team: 0, knockouts: 1 }] },
      { ...recap, players: [{ ghost: 1, team: 4, knockouts: 1 }] },
      { ...recap, players: [{ ghost: 1, team: 0, knockouts: 1.5 }] },
      { ...recap, players: 'all' },
      { ...recap, awards: null },
      { ...recap, awards: { survivor: { ghost: 2, ms: -1 } } },
      { ...recap, awards: { bestPusher: { ghost: 300, knockouts: 2 } } },
      { ...recap, awards: { bestPusher: { ghost: 7, knockouts: 0 } } },
      { ...recap, awards: { survivor: { ghost: 2, ms: 'long' } } },
      { ...recap, players: [...players, ...players, { ghost: 1, team: 0, knockouts: 0 }] },
      { ...recap, pad: 'x'.repeat(4096) },
    ];
    for (const r of bad)
      expect(parseServerMessage(JSON.stringify(r)), JSON.stringify(r).slice(0, 80)).toBeNull();
  });
});
