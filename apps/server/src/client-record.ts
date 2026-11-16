// Seasonal Spirits — one connected client as the match server keeps it: what it is (pending
// until its hello, then player or spectator), its socket and address, and its message budget
// per second (THREATS: every message counts, valid or not).

import type { RawData, WebSocket } from 'ws';

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

export function rawToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}
