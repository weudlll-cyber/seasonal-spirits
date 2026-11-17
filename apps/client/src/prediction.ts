// Seasonal Sumo — where the client draws its own ghost (from Seasonal Spirits' session
// 2026-11-16-RESPONSE): moved at once by the player's own direction and dash with the server's
// movement rules (game-core stepGhost: momentum, friction, top speed; dashVelocity), pulled
// smoothly towards what the server says, snapped to it when far off; inside the walls of hill
// and bomb as the core keeps it (fieldBounds). Display only: the server's position is the
// truth and nothing of this leaves the client (THREATS row 36).

import {
  DEFAULT_CONFIG,
  clamp,
  dashVelocity,
  fieldBounds,
  stepGhost,
  type GameConfig,
  type Motion,
} from '@seasonal-spirits/game-core';
import type { Direction } from './input-sender.js';

// The newest server state's word on the own ghost.
export interface ServerOwn extends Motion {
  dashLeftMs: number; // the server's cooldown: a dash before 0 does nothing
  frozen: boolean; // falling, out, or the match is over: the server does not let it move
  receivedAt: number; // client time the state arrived
}

// How long a sent direction takes to show in an arriving state: the wait for the next tick
// and the way back (measured 2026-11-16: median 29–41 ms, reports/response). Placeholder —
// owner decides.
export const PREDICTION_LAG_MS = 40;
// The share of the gap closed per frame is frame time / this, so a gap fades within a few
// frames without the ghost jumping. Placeholder — owner decides.
export const CORRECTION_MS = 150;
// A gap above this (a respawn, a knock the client could not see coming, a long stall) is
// closed at once. Placeholder — owner decides.
export const SNAP_DISTANCE = 100;
const HISTORY_MS = 1000; // own path kept to compare with the server's older word
const MAX_FRAME_MS = 100; // a stalled tab does not fling the ghost forward

type Point = Motion & { at: number };

export class OwnPrediction {
  private cfg: GameConfig;
  // The path the own inputs alone give, and the correction added to it for drawing.
  private path: Point[] = [];
  private offset = { x: 0, y: 0 };

  constructor(cfg: GameConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
  }

  // The rules of the mode on screen (its walls); the server's rotation changes them.
  useConfig(cfg: GameConfig): void {
    this.cfg = cfg;
  }

  // Once per frame; null without a server position (not placed yet, or watching). `dash`: the
  // player pressed Dash since the last frame.
  update(
    now: number,
    dir: Direction,
    server: ServerOwn | null,
    dash = false,
  ): { x: number; y: number } | null {
    if (!server) {
      this.path = [];
      return null;
    }
    const last = this.path.at(-1);
    if (!last || server.frozen) {
      this.path = [{ at: now, x: server.x, y: server.y, vx: server.vx, vy: server.vy }];
      this.offset = { x: 0, y: 0 };
    } else {
      const dt = Math.min(MAX_FRAME_MS, Math.max(0, now - last.at));
      const v = dash && server.dashLeftMs === 0 ? dashVelocity(this.cfg, last, dir) : null;
      const from = v ? { ...last, vx: v.x, vy: v.y } : last;
      const to = stepGhost(this.cfg, from, dir, dt);
      this.path.push({ at: now, ...to });
      while ((this.path[0]?.at ?? now) < now - HISTORY_MS) this.path.shift();
      this.correct(server, dt);
    }
    const head = this.path.at(-1) ?? server;
    const b = fieldBounds(this.cfg);
    return {
      x: clamp(head.x + this.offset.x, b.lo, b.hi),
      y: clamp(head.y + this.offset.y, b.lo, b.hi),
    };
  }

  // The server's position is where the own path was PREDICTION_LAG_MS before the state
  // arrived; the gap between the two moves the correction. A gap past SNAP_DISTANCE restarts
  // the path from the server's motion (a knock or a respawn the client could not foresee).
  private correct(server: ServerOwn, dt: number): void {
    const then = this.pathAt(server.receivedAt - PREDICTION_LAG_MS);
    const gx = server.x - (then.x + this.offset.x);
    const gy = server.y - (then.y + this.offset.y);
    if (Math.hypot(gx, gy) > SNAP_DISTANCE) {
      const at = this.path.at(-1)?.at ?? 0;
      this.path = [{ at, x: server.x, y: server.y, vx: server.vx, vy: server.vy }];
      this.offset = { x: 0, y: 0 };
      return;
    }
    const k = Math.min(1, dt / CORRECTION_MS);
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
