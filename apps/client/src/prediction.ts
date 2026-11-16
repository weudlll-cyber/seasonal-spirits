// Seasonal Spirits — where the client draws its own ghost (session 2026-11-16-RESPONSE): moved
// at once by the player's own direction with the server's movement rule (game-core stepGhost),
// pulled smoothly towards what the server says, snapped to it when far off. Display only: the
// server's position is the truth and nothing of this leaves the client (THREATS).

import { DEFAULT_CONFIG, clamp, stepGhost, type GameConfig } from '@seasonal-spirits/game-core';
import type { Direction } from './input-sender.js';

// The newest server state's word on the own ghost.
export interface ServerOwn {
  x: number;
  y: number;
  carrying: boolean;
  frozen: boolean; // securing, or the match is over: the server does not move it
  receivedAt: number; // client time the state arrived
}

// How long a sent direction takes to show in an arriving state: the wait for the next tick
// and the way back (measured 2026-11-16: median 29–41 ms, reports/response). Placeholder —
// owner decides.
export const PREDICTION_LAG_MS = 40;
// The share of the gap closed per frame is frame time / this, so a gap fades within a few
// frames without the ghost jumping. Placeholder — owner decides.
export const CORRECTION_MS = 150;
// A gap above this (a new match back at the shrine, a long stall) is closed at once.
// Placeholder — owner decides.
export const SNAP_DISTANCE = 100;
const HISTORY_MS = 1000; // own path kept to compare with the server's older word
const MAX_FRAME_MS = 100; // a stalled tab does not fling the ghost forward

interface Point {
  at: number;
  x: number;
  y: number;
}

export class OwnPrediction {
  private readonly cfg: GameConfig;
  // The path the own inputs alone give, and the correction added to it for drawing.
  private path: Point[] = [];
  private offset = { x: 0, y: 0 };

  constructor(cfg: GameConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
  }

  // Once per frame; null without a server position (not placed yet, or watching).
  update(now: number, dir: Direction, server: ServerOwn | null): { x: number; y: number } | null {
    if (!server) {
      this.path = [];
      return null;
    }
    const last = this.path.at(-1);
    if (!last) {
      this.path = [{ at: now, x: server.x, y: server.y }];
      this.offset = { x: 0, y: 0 };
    } else {
      const dt = Math.min(MAX_FRAME_MS, Math.max(0, now - last.at));
      const to = server.frozen
        ? last
        : stepGhost(this.cfg, { ...last, carrying: server.carrying }, dir, dt);
      this.path.push({ at: now, x: to.x, y: to.y });
      while ((this.path[0]?.at ?? now) < now - HISTORY_MS) this.path.shift();
      this.correct(server, dt);
    }
    const head = this.path.at(-1) ?? { x: server.x, y: server.y };
    const size = this.cfg.fieldSize;
    return {
      x: clamp(head.x + this.offset.x, 0, size),
      y: clamp(head.y + this.offset.y, 0, size),
    };
  }

  // The server's position is where the own path was PREDICTION_LAG_MS before the state
  // arrived; the gap between the two moves the correction.
  private correct(server: ServerOwn, dt: number): void {
    const then = this.pathAt(server.receivedAt - PREDICTION_LAG_MS);
    const gx = server.x - (then.x + this.offset.x);
    const gy = server.y - (then.y + this.offset.y);
    const k = Math.hypot(gx, gy) > SNAP_DISTANCE ? 1 : Math.min(1, dt / CORRECTION_MS);
    this.offset = { x: this.offset.x + gx * k, y: this.offset.y + gy * k };
  }

  // The own path at a past moment, between the two frames around it.
  private pathAt(t: number): { x: number; y: number } {
    const first = this.path[0] ?? { at: t, x: 0, y: 0 };
    if (t <= first.at) return first;
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1] as Point;
      const b = this.path[i] as Point;
      if (t <= b.at) {
        const u = b.at > a.at ? (t - a.at) / (b.at - a.at) : 1;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    return this.path.at(-1) ?? first;
  }
}
