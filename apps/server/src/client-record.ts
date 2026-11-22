// Seasonal Spirits — one connected client as the match server keeps it: what it is (pending
// until its hello, then player or spectator), its socket and address, its message budget per
// second (THREATS: every message counts, valid or not) and the bound on its unsent bytes.

import type { RawData, WebSocket } from 'ws';

// WebSocket close code 1008: policy violation.
export const POLICY_VIOLATION = 1008;

export interface ClientRecord {
  id: number;
  kind: 'player' | 'spectator' | 'pending';
  ws: WebSocket;
  address: string;
  messagesThisSecond: number;
  messageWindowStart: number;
  helloTimer: NodeJS.Timeout;
}

// Counts one more message; false once the client is over `perSecond` in the current second.
export function withinRate(rec: ClientRecord, perSecond: number, now: number): boolean {
  if (now - rec.messageWindowStart >= 1000) {
    rec.messageWindowStart = now;
    rec.messagesThisSecond = 0;
  }
  rec.messagesThisSecond++;
  return rec.messagesThisSecond <= perSecond;
}

// Sends one message unless the client already holds more than `maxBufferedBytes` unsent (audit
// 2026-11-22 P1 M2): a client that stops reading would grow the server's memory by one state
// per tick. Over the bound it is closed instead — no further sends while it closes, and ws ends
// the socket after its close timeout; the client shows the connection as lost.
export function sendWithin(
  ws: WebSocket,
  data: Uint8Array | string,
  maxBufferedBytes: number,
): void {
  if (ws.bufferedAmount > maxBufferedBytes) {
    ws.close(POLICY_VIOLATION, 'send queue full');
    return;
  }
  if (typeof data === 'string') ws.send(data);
  else ws.send(data, { binary: true });
}

export function rawToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}
