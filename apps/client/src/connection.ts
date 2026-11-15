// Seasonal Spirits — the client's one WebSocket: hello, welcome, states, and what it sends.
// A player sends only a direction and the one action (the server is the only truth); the
// direction goes out when it changes, at most every SEND_INTERVAL_MS, so a player stays well
// inside the server's 20 messages per second. A spectator sends nothing after its hello.

import {
  decodeState,
  parseServerMessage,
  trimBuffer,
  type BufferedState,
  type GameAction,
  type ServerState,
  type ServerWelcome,
} from '@seasonal-spirits/protocol';

declare const __SERVER_PORT__: number;

const SEND_INTERVAL_MS = 100;
const KEEP_STATES_MS = 2000;

export type Mode = 'connecting' | 'player' | 'spectator' | 'closed';

export interface ConnectionEvents {
  onState: (s: ServerState) => void; // every state, in order, before it is buffered
  onMode: (mode: Mode, reason: 'full' | null) => void;
}

export class Connection {
  readonly buffer: BufferedState[] = [];
  mode: Mode = 'connecting';
  welcome: ServerWelcome | null = null;
  private readonly ws: WebSocket;
  private readonly events: ConnectionEvents;
  private dir = { dx: 0, dy: 0 };
  private sentDir = { dx: 0, dy: 0 };
  private lastSendAt = 0;

  constructor(hello: 'player' | 'spectator', events: ConnectionEvents) {
    this.events = events;
    this.ws = new WebSocket(`ws://${location.hostname}:${__SERVER_PORT__}`);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ kind: hello }));
      if (hello === 'spectator') this.setMode('spectator', null);
    };
    this.ws.onmessage = (ev: MessageEvent<unknown>) => {
      this.onMessage(ev.data);
    };
    this.ws.onclose = () => {
      this.setMode('closed', null);
    };
  }

  // The latest direction; sent on the next flush if it changed.
  steer(dx: number, dy: number): void {
    this.dir = { dx, dy };
  }

  act(action: GameAction): void {
    if (this.mode !== 'player') return;
    this.ws.send(JSON.stringify({ kind: 'action', action }));
  }

  // Called once per frame: sends the direction if it changed and the interval has passed.
  flush(now: number): void {
    if (this.mode !== 'player' || now - this.lastSendAt < SEND_INTERVAL_MS) return;
    if (this.dir.dx === this.sentDir.dx && this.dir.dy === this.sentDir.dy) return;
    this.ws.send(JSON.stringify({ kind: 'input', ...this.dir }));
    this.sentDir = this.dir;
    this.lastSendAt = now;
  }

  private onMessage(data: unknown): void {
    if (data instanceof ArrayBuffer) {
      let state: ServerState;
      try {
        state = decodeState(new Uint8Array(data));
      } catch {
        return; // a frame of the wrong length is dropped, never half read
      }
      const now = performance.now();
      this.events.onState(state);
      this.buffer.push({ receivedAt: now, state });
      trimBuffer(this.buffer, now, KEEP_STATES_MS);
      return;
    }
    const msg = typeof data === 'string' ? parseServerMessage(data) : null;
    if (msg?.kind === 'welcome') {
      this.welcome = msg;
      this.setMode('player', null);
    } else if (msg?.kind === 'spectating') {
      this.setMode('spectator', msg.reason);
    }
  }

  private setMode(mode: Mode, reason: 'full' | null): void {
    this.mode = mode;
    this.events.onMode(mode, reason);
  }
}
