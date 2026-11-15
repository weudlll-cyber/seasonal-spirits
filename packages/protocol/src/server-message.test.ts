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
