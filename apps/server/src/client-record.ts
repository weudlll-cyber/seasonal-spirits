// Seasonal Spirits — one connected client as the match server keeps it: what it is (pending
// until its hello, then player or spectator), its socket and address, its message budget per
// second (THREATS: every message counts, valid or not), the bounds on how many clients there are,
// the bound on its unsent bytes and the liveness ping.

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
  answered: boolean; // a pong since the last liveness ping (pingSweep)
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

export interface Bounds {
  total: number; // all clients
  perAddress: number; // the clients of one address
  pendingPerAddress: number; // the clients of one address not past their hello yet
}

// Whether one more client from `address` fits (audit 2026-11-22 P1 L1): an address holds at most
// its share of the room, and fewer of it before their hello, so it cannot keep the others out
// with sockets that only wait out the hello timeout. At most twice the seats to count.
export function admits(clients: Iterable<ClientRecord>, address: string, b: Bounds): boolean {
  let all = 0;
  let mine = 0;
  let pending = 0;
  for (const c of clients) {
    all++;
    if (c.address !== address) continue;
    mine++;
    if (c.kind === 'pending') pending++;
  }
  return all < b.total && mine < b.perAddress && pending < b.pendingPerAddress;
}

// One liveness sweep (audit 2026-11-22 P1 M2, its second half), on the server's clock: a client
// that has not answered the previous sweep's ping is ended — a socket gone without a close, as a
// phone that lost its network leaves it, is dropped after one to two intervals instead of holding
// its seat — and every other one gets a new ping. Browsers and ws answer pings on their own.
export function pingSweep(clients: Iterable<ClientRecord>): void {
  for (const c of clients) {
    if (c.ws.readyState !== c.ws.OPEN) continue;
    if (!c.answered) {
      c.ws.terminate();
      continue;
    }
    c.answered = false;
    c.ws.ping();
  }
}

export function rawToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}
