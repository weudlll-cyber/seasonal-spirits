// Seasonal Spirits — server text message reader tests: a welcome is read, anything else dropped.

import { describe, expect, it } from 'vitest';
import { parseServerMessage } from './server-message.js';

describe('parseServerMessage', () => {
  it('reads a welcome with only its known fields', () => {
    const text = JSON.stringify({ kind: 'welcome', ghost: 7, team: 3, extra: 'x' });
    expect(parseServerMessage(text)).toEqual({ kind: 'welcome', ghost: 7, team: 3 });
  });

  it('drops non-JSON, non-objects, other kinds and out-of-range fields', () => {
    for (const text of [
      'nope',
      'null',
      '[1]',
      '{"kind":"other","ghost":1,"team":1}',
      '{"kind":"welcome","ghost":256,"team":1}',
      '{"kind":"welcome","ghost":1,"team":4}',
      '{"kind":"welcome","ghost":1.5,"team":1}',
      `{"kind":"welcome","ghost":1,"team":1,"pad":"${'x'.repeat(300)}"}`,
    ]) {
      expect(parseServerMessage(text)).toBeNull();
    }
  });
});
