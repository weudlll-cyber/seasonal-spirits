// Seasonal Spirits — the bound on a client's unsent bytes (THREATS row 21c).
// Why: a client that stops reading must not grow the server's memory one state per tick.

import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { POLICY_VIOLATION, sendWithin } from './client-record.js';

// A stand-in socket: how much it holds unsent, and what was sent or how it was closed.
function fakeSocket(bufferedAmount: number) {
  const sent: unknown[] = [];
  const closes: [number, string][] = [];
  const ws = {
    bufferedAmount,
    send: (data: unknown) => sent.push(data),
    close: (code: number, reason: string) => closes.push([code, reason]),
  };
  return { ws: ws as unknown as WebSocket, sent, closes };
}

describe('sendWithin', () => {
  it('sends while the unsent bytes are within the bound, text and binary', () => {
    const f = fakeSocket(1000);
    sendWithin(f.ws, 'tuning', 1000);
    sendWithin(f.ws, new Uint8Array(3), 1000);
    expect(f.sent).toHaveLength(2);
    expect(f.closes).toEqual([]);
  });

  it('closes a client whose unsent bytes passed the bound, and sends it nothing', () => {
    const f = fakeSocket(1001);
    sendWithin(f.ws, new Uint8Array(3), 1000);
    expect(f.sent).toEqual([]);
    expect(f.closes).toEqual([[POLICY_VIOLATION, 'send queue full']]);
  });
});
