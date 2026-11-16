// Seasonal Spirits — the client's one WebSocket: hello, welcome, states, steal notices, the
// match recap, team signals, and what it sends.
// A player sends only a direction and the one action (the server is the only truth); the
// direction goes out as soon as it changes, within the gap of input-sender.ts. A spectator
// sends nothing after its hello.

import {
  decodeState,
  parseServerMessage,
  trimBuffer,
  type BufferedState,
  type GameAction,
  type ServerMessage,
  type ServerRecap,
  type ServerSignal,
  type ServerState,
  type ServerSteal,
  type ServerWelcome,
  type TeamSignal,
} from '@seasonal-spirits/protocol';

import { InputSender, type Direction } from './input-sender.js';

declare const __SERVER_PORT__: number;

const KEEP_STATES_MS = 2000;

export type Mode = 'connecting' | 'player' | 'spectator' | 'closed';

export interface ConnectionEvents {
  onState: (s: ServerState) => void; // every state, in order, before it is buffered
  onMode: (mode: Mode, reason: 'full' | null) => void;
  onSteal: (steal: ServerSteal) => void; // a steal this player took part in
  onRecap: (recap: ServerRecap) => void; // the match just ended: result and awards
  onSignal: (signal: ServerSignal) => void; // a teammate's (or the own) team signal
}

export class Connection {
  readonly buffer: BufferedState[] = [];
  mode: Mode = 'connecting';
  welcome: ServerWelcome | null = null;
  private readonly ws: WebSocket;
  private readonly events: ConnectionEvents;
  private readonly sender = new InputSender();

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

  // The direction the player holds now (the own ghost's prediction moves with it).
  get direction(): Direction {
    return this.sender.direction;
  }

  // The latest direction; sent at once if it changed (input-sender.ts).
  steer(dx: number, dy: number): void {
    this.sender.hold({ dx, dy });
    this.flush(performance.now());
  }

  act(action: GameAction): void {
    if (this.mode !== 'player') return;
    this.ws.send(JSON.stringify({ kind: 'action', action }));
  }

  // The server limits signals per player; the client sends what the player pressed.
  signal(signal: TeamSignal): void {
    if (this.mode !== 'player') return;
    this.ws.send(JSON.stringify({ kind: 'signal', signal }));
  }

  // Called at every change and once per frame: sends a change the gap held back.
  flush(now: number): void {
    if (this.mode !== 'player') return;
    const dir = this.sender.due(now);
    if (dir) this.ws.send(JSON.stringify({ kind: 'input', ...dir }));
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
    if (msg) this.onText(msg);
  }

  // A text message that passed the shared reader.
  private onText(msg: ServerMessage): void {
    switch (msg.kind) {
      case 'welcome':
        this.welcome = msg;
        this.setMode('player', null);
        return;
      case 'spectating':
        this.setMode('spectator', msg.reason);
        return;
      case 'steal':
        if (this.mode === 'player') this.events.onSteal(msg);
        return;
      case 'recap':
        this.events.onRecap(msg);
        return;
      case 'signal':
        this.events.onSignal(msg);
        return;
    }
  }

  private setMode(mode: Mode, reason: 'full' | null): void {
    this.mode = mode;
    this.events.onMode(mode, reason);
  }
}
