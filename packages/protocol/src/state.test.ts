// Seasonal Spirits — protocol state encode/decode round trips and byte-size checks.

import { describe, expect, it } from 'vitest';
import {
  GHOST_BYTES,
  HEADER_BYTES,
  decodeState,
  encodeState,
  encodedSize,
  type ServerState,
} from './state.js';

function sample(count: number): ServerState {
  const ghosts = [];
  for (let i = 0; i < count; i++) {
    ghosts.push({ id: i, x: 100 + i, y: 1000 - i, flags: i & 0xff });
  }
  return { tick: 42, serverMs: 123_456, ghosts };
}

describe('state encoding', () => {
  it('round-trips 0 ghosts', () => {
    const s = sample(0);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('round-trips 1 ghost', () => {
    const s = sample(1);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(HEADER_BYTES + GHOST_BYTES);
    expect(decodeState(buf)).toEqual(s);
  });

  it('round-trips 32 ghosts', () => {
    const s = sample(32);
    const buf = encodeState(s);
    expect(buf.byteLength).toBe(encodedSize(32));
    expect(decodeState(buf)).toEqual(s);
  });

  it('32-ghost message fits well under 1 KB', () => {
    const size = encodedSize(32);
    expect(size).toBe(HEADER_BYTES + GHOST_BYTES * 32);
    expect(size).toBeLessThan(1024);
  });

  it('rejects a corrupted length', () => {
    const buf = encodeState(sample(3));
    expect(() => decodeState(buf.slice(0, buf.byteLength - 1))).toThrow();
  });
});
