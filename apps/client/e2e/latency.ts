// Seasonal Spirits — reads a client recording (recorder.ts) into the latency samples of
// session 2026-11-16-RESPONSE: key press → own ghost drawn moving, coin spawned → coin drawn,
// and the pickup offset (drawn shapes touch → coin gone) for both coin sources.
// Times are the page's performance.now(); the server's clock is mapped onto it by the smallest
// arrival delay seen (localhost: below a millisecond).

import { DEFAULT_CONFIG, spread, touchesCoin, type Spread } from '@seasonal-spirits/game-core';
import {
  STATE_HALVING_EVENT,
  STATE_RESULT,
  decodeState,
  interpolate,
  type BufferedState,
  type CoinState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import type { RecordedFrame, Recording } from './recorder.js';

const DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};
const MOVED = 1; // field units along the pressed direction that count as moving
const SAMPLE_LIMIT_MS = 1500; // a key sample slower than this is dropped (pushed, blocked)
const SAMPLES = 50;

export interface KeySample {
  keyMs: number;
  inputMs: number; // key → direction sent
  tickMs: number; // sent → state with the moved ghost arrived (tick wait + transit)
  renderMs: number; // that state arrived → drawn moving
  totalMs: number; // key → drawn moving
}

export interface CoinSample {
  transitMs: number; // spawned (server tick) → state arrived
  renderMs: number; // arrived → drawn
  totalMs: number;
}

// Drawn shapes touch → coin gone, for the two coin sources a client can draw.
export interface PickupSample {
  own: boolean;
  bufferedMs: number; // coins of the drawn (buffered) moment, today
  newestMs: number; // coins of the newest state
}

interface Arrived extends BufferedState {
  state: ServerState;
}

const key = (c: CoinState): string => `${c.x},${c.y}`;

function firstIndex<T>(xs: readonly T[], from: number, ok: (x: T) => boolean): number {
  for (let i = from; i < xs.length; i++) if (ok(xs[i] as T)) return i;
  return -1;
}

export class Analysis {
  readonly states: Arrived[];
  readonly offset: number; // add to a server time to get page time
  private readonly rec: Recording;
  private readonly ownId: number;

  constructor(rec: Recording, ownId: number) {
    this.rec = rec;
    this.ownId = ownId;
    this.states = rec.states.map(([at, bytes]) => ({
      receivedAt: at,
      state: decodeState(new Uint8Array(bytes)),
    }));
    this.offset = Math.min(...this.states.map((s) => s.receivedAt - s.state.serverMs));
  }

  private own(s: ServerState): { x: number; y: number } | undefined {
    return s.ghosts.find((g) => g.id === this.ownId);
  }

  // Each movement key press from `fromMs` on (the presses from standing): when it was sent,
  // when the server's state showed it, when the client drew it.
  keySamples(fromMs: number): KeySample[] {
    const out: KeySample[] = [];
    for (const [keyMs, type, code] of this.rec.keys) {
      const dir = DIRS[code];
      const sample = type === 'keydown' && dir && keyMs >= fromMs && this.keySample(keyMs, dir);
      if (sample) out.push(sample);
    }
    return out.slice(0, SAMPLES);
  }

  private keySample(keyMs: number, dir: [number, number]): KeySample | null {
    const along = (p: { x: number; y: number }, q: { x: number; y: number }): number =>
      (q.x - p.x) * dir[0] + (q.y - p.y) * dir[1];
    const sent = this.rec.sent.find(([at, text]) => at >= keyMs && text.includes('"input"'));
    const before = this.states.findLast((s) => s.receivedAt <= keyMs);
    const p0 = before && this.own(before.state);
    const frame0 = this.rec.frames.findLast((f) => f.frameMs <= keyMs)?.own;
    if (!sent || !p0 || !frame0) return null;
    const moved = this.states.find((s) => {
      const p = s.receivedAt > keyMs ? this.own(s.state) : undefined;
      return p !== undefined && along(p0, p) >= MOVED;
    });
    const drawn = this.rec.frames.find(
      (f) => f.frameMs > keyMs && f.own !== null && along(frame0, f.own) >= MOVED,
    );
    if (!moved || !drawn || drawn.frameMs - keyMs > SAMPLE_LIMIT_MS) return null;
    return {
      keyMs,
      inputMs: sent[0] - keyMs,
      tickMs: moved.receivedAt - sent[0],
      renderMs: drawn.frameMs - moved.receivedAt,
      totalMs: drawn.frameMs - keyMs,
    };
  }

  // Index pairs (k − 1, k) inside one running match, without a halving between them.
  private steps(): number[] {
    const out: number[] = [];
    for (let k = 1; k < this.states.length; k++) {
      const a = this.states[k - 1]?.state;
      const b = this.states[k]?.state;
      if (!a || !b || b.matchMs < a.matchMs || (a.flags | b.flags) & STATE_RESULT) continue;
      if (b.flags & STATE_HALVING_EVENT) continue;
      out.push(k);
    }
    return out;
  }

  private frameShowing(from: number, field: 'coinsMs' | 'latestMs' | 'targetMs', ms: number) {
    return this.rec.frames.find((f) => f.frameMs >= from && (f[field] ?? -Infinity) >= ms);
  }

  // Each new coin: its server tick → its arrival → the first frame drawing its state's coins.
  coinSamples(): CoinSample[] {
    const out: CoinSample[] = [];
    for (const k of this.steps()) {
      const a = this.states[k - 1] as Arrived;
      const b = this.states[k] as Arrived;
      const old = new Set(a.state.coins.map(key));
      if (!b.state.coins.some((c) => !old.has(key(c)))) continue;
      const spawnMs = b.state.serverMs + this.offset;
      const drawn = this.frameShowing(b.receivedAt, 'coinsMs', b.state.serverMs);
      if (!drawn) continue;
      out.push({
        transitMs: b.receivedAt - spawnMs,
        renderMs: drawn.frameMs - b.receivedAt,
        totalMs: drawn.frameMs - spawnMs,
      });
    }
    return out.slice(0, SAMPLES);
  }

  // Where a ghost was drawn in a frame: the own one as the client recorded it, any other
  // by the client's own interpolation over the states it had then.
  private drawnAt(f: RecordedFrame, ghost: number): { x: number; y: number } | undefined {
    if (ghost === this.ownId) return f.own ?? undefined;
    if (f.targetMs === null) return undefined;
    const upTo = this.states.filter(
      (s) => s.receivedAt <= f.frameMs && s.receivedAt > f.frameMs - 1000,
    );
    return interpolate(upTo, f.targetMs).ghosts.find((g) => g.id === ghost);
  }

  // Each coin taken in a running match: the first frame whose drawn taker touches it, against
  // the first frame not drawing it under either coin source.
  pickupSamples(): PickupSample[] {
    const out: PickupSample[] = [];
    for (const k of this.steps()) {
      const a = this.states[k - 1] as Arrived;
      const b = this.states[k] as Arrived;
      const now = new Set(b.state.coins.map(key));
      for (const coin of a.state.coins.filter((c) => !now.has(key(c)))) {
        const sample = this.pickup(a, b, coin);
        if (sample) out.push(sample);
      }
    }
    return out;
  }

  private pickup(a: Arrived, b: Arrived, coin: CoinState): PickupSample | null {
    const cfg = DEFAULT_CONFIG;
    const taker = b.state.ghosts
      .filter((g) => touchesCoin(cfg, g, Math.max(0, g.carried - 1), coin))
      .sort((x, y) => x.id - y.id)[0];
    const carried = a.state.ghosts.find((g) => g.id === taker?.id)?.carried;
    if (!taker || carried === undefined) return null;
    const first = this.states.findIndex((s) => s.state.coins.some((c) => key(c) === key(coin)));
    const from = Math.max(this.states[first]?.receivedAt ?? 0, b.receivedAt - 1000);
    const start = firstIndex(this.rec.frames, 0, (f) => f.frameMs >= from);
    const touch = firstIndex(this.rec.frames, Math.max(0, start), (f) => {
      if (f.frameMs > b.receivedAt + 1000) return true;
      const p = this.drawnAt(f, taker.id);
      return p !== undefined && touchesCoin(cfg, p, carried, coin);
    });
    const touchFrame = this.rec.frames[touch];
    const buffered = this.frameShowing(from, 'targetMs', b.state.serverMs);
    const newest = this.frameShowing(from, 'latestMs', b.state.serverMs);
    if (!touchFrame || touchFrame.frameMs > b.receivedAt + 1000 || !buffered || !newest) {
      return null;
    }
    return {
      own: taker.id === this.ownId,
      bufferedMs: buffered.frameMs - touchFrame.frameMs,
      newestMs: newest.frameMs - touchFrame.frameMs,
    };
  }
}

export interface LatencySummary {
  keyToMove: Record<'total' | 'input' | 'tick' | 'render', Spread>;
  coinToDrawn: Record<'total' | 'transit' | 'render', Spread>;
  pickupOffset: Record<'own' | 'other', Record<'buffered' | 'newest', Spread>>;
}

export function summarise(an: Analysis, pressesFromMs: number): LatencySummary {
  const keys = an.keySamples(pressesFromMs);
  const coins = an.coinSamples();
  const picks = an.pickupSamples();
  const of = (own: boolean): Record<'buffered' | 'newest', Spread> => {
    const p = picks.filter((s) => s.own === own);
    return {
      buffered: spread(p.map((s) => s.bufferedMs)),
      newest: spread(p.map((s) => s.newestMs)),
    };
  };
  return {
    keyToMove: {
      total: spread(keys.map((s) => s.totalMs)),
      input: spread(keys.map((s) => s.inputMs)),
      tick: spread(keys.map((s) => s.tickMs)),
      render: spread(keys.map((s) => s.renderMs)),
    },
    coinToDrawn: {
      total: spread(coins.map((s) => s.totalMs)),
      transit: spread(coins.map((s) => s.transitMs)),
      render: spread(coins.map((s) => s.renderMs)),
    },
    pickupOffset: { own: of(true), other: of(false) },
  };
}
