// Seasonal Sumo — where the client draws its own ghost (from Seasonal Spirits' session
// 2026-11-16-RESPONSE): moved at once by the player's own direction and dash with the server's
// movement rules (game-core stepGhost: momentum, friction, top speed; dashVelocity), pulled
// smoothly towards what the server says, snapped to it when far off; inside the walls of hill
// and bomb as the core keeps it (fieldBounds); stopped at another ghost it touches, never drawn
// through it (FIX 2026-11-17-3), until the server's answer moves it on; in the air after a jump
// barely steered and touching nobody, as the core (jump.ts airSteer; JUMP 2026-11-17); with the
// dash's wind-up on, held still until the dash goes (game-core windup.ts). Display only: the
// server's position is the truth and nothing of this leaves the client (THREATS row 36).

import {
  DEFAULT_CONFIG,
  IDLE,
  airSteer,
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
  jumpLeftMs: number; // the same for the jump
  airborne: boolean; // the server has it in the air
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

// What the player did since the last frame, and the ghosts the own one may not pass through
// (those the server lets it touch: on the arena, not protected — drawn where they are now).
export interface FrameInput {
  dash?: boolean; // the player pressed Dash
  jump?: boolean; // the player pressed Jump
  others?: readonly { x: number; y: number }[];
}

// Moved out of every ghost it overlaps to touching distance, with the speed into it taken
// away: the own ghost stops at a ghost as the server's contact stops it (restitution 0). In a
// crowd, moving out of one may move it into the next: a few passes, until none overlaps (or
// none can — wedged between two, where the server pushes the others aside).
const STOP_PASSES = 4;
function stopAt(m: Motion, others: readonly { x: number; y: number }[], reach: number): Motion {
  let out = m;
  for (let pass = 0; pass < STOP_PASSES; pass++) {
    const next = stopOnce(out, others, reach);
    if (next.x === out.x && next.y === out.y) break;
    out = next;
  }
  return out;
}

function clear(
  p: { x: number; y: number },
  others: readonly { x: number; y: number }[],
  reach: number,
): boolean {
  return others.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= reach - 1e-6);
}

function stopOnce(m: Motion, others: readonly { x: number; y: number }[], reach: number): Motion {
  let { x, y, vx, vy } = m;
  for (const o of others) {
    const dx = x - o.x;
    const dy = y - o.y;
    const d = Math.hypot(dx, dy);
    if (d >= reach || d === 0) continue;
    const nx = dx / d;
    const ny = dy / d;
    x = o.x + nx * reach;
    y = o.y + ny * reach;
    const into = vx * nx + vy * ny;
    if (into < 0) {
      vx -= into * nx;
      vy -= into * ny;
    }
  }
  return { x, y, vx, vy };
}

export class OwnPrediction {
  private cfg: GameConfig;
  // The path the own inputs alone give, and the correction added to it for drawing.
  private path: Point[] = [];
  private offset = { x: 0, y: 0 };
  private shown: { x: number; y: number } | null = null; // drawn in the last frame
  private airUntil = 0; // client time a jump the player pressed ends
  // A dash pressed with the wind-up on (game-core windup.ts): held until `until`, then this
  // velocity — as the core does, so the own ghost does not run ahead of the server.
  private wind: { until: number; v: { x: number; y: number } } | null = null;
  private air = false; // in the air in the last frame

  constructor(cfg: GameConfig = DEFAULT_CONFIG) {
    this.cfg = cfg;
  }

  // The rules of the mode on screen (its walls); the server's rotation changes them.
  useConfig(cfg: GameConfig): void {
    this.cfg = cfg;
  }

  // Once per frame; null without a server position (not placed yet, or watching).
  update(
    now: number,
    dir: Direction,
    server: ServerOwn | null,
    input: FrameInput = {},
  ): { x: number; y: number } | null {
    if (!server) {
      this.path = [];
      this.shown = null;
      return null;
    }
    const air = this.inAir(now, server, input.jump === true);
    this.air = air;
    // In the air it touches nobody (jump.ts): no ghost stops it.
    const others = air ? [] : (input.others ?? []);
    const reach = 2 * this.cfg.ghostRadius;
    const last = this.path.at(-1);
    if (!last || server.frozen) {
      this.path = [{ at: now, x: server.x, y: server.y, vx: server.vx, vy: server.vy }];
      this.offset = { x: 0, y: 0 };
      this.wind = null; // a fall ends a wind-up on the server too
    } else {
      this.advance(last, { now, dir, dash: input.dash === true, air }, server, others);
    }
    const head = this.path.at(-1) ?? server;
    const b = fieldBounds(this.cfg);
    // The correction may pull it into a ghost too: what is drawn stays outside every one.
    const drawn = { x: head.x + this.offset.x, y: head.y + this.offset.y, vx: 0, vy: 0 };
    const out = stopAt(drawn, others, reach);
    const free = { x: clamp(out.x, b.lo, b.hi), y: clamp(out.y, b.lo, b.hi) };
    // Wedged between ghosts with no free spot: it stays where it was drawn, as long as that is
    // clear, until the server's answer moves the others aside.
    const stay = !clear(free, others, reach) && this.shown && clear(this.shown, others, reach);
    this.shown = stay && this.shown ? this.shown : free;
    return this.shown;
  }

  // Drawn in the air in the last frame (the jump's look starts with the press, not the echo).
  airborne(): boolean {
    return this.air;
  }

  // In the air now: a jump pressed now or a moment ago that the server allows (switch on,
  // cooldown over — the core's rule), so the drawn take-off and landing are not a tick late; a
  // jump the server reports that this client did not start (its state is newer than the own
  // jump's end) counts from that state's time.
  private inAir(now: number, server: ServerOwn, jump: boolean): boolean {
    const ready = this.cfg.jump.enabled && server.jumpLeftMs === 0 && !server.frozen;
    if (jump && ready && !server.airborne && now >= this.airUntil) {
      this.airUntil = now + this.cfg.jump.airMs;
    }
    const stateAt = server.receivedAt - PREDICTION_LAG_MS;
    if (server.airborne && this.airUntil <= stateAt) this.airUntil = stateAt + this.cfg.jump.airMs;
    return now < this.airUntil;
  }

  // One frame on from the last path point by the own input (in the air barely steered, no dash),
  // stopped at the ghosts it touches, then corrected towards the server's word.
  private advance(
    last: Point,
    frame: { now: number; dir: Direction; dash: boolean; air: boolean },
    server: ServerOwn,
    others: readonly { x: number; y: number }[],
  ): void {
    const { now, dir, dash, air } = frame;
    const dt = Math.min(MAX_FRAME_MS, Math.max(0, now - last.at));
    const ready = dash && !air && server.dashLeftMs === 0;
    const v = this.dashNow(now, air, ready ? dashVelocity(this.cfg, last, dir) : null);
    const holding = this.wind !== null;
    const from = v ? { ...last, vx: v.x, vy: v.y } : holding ? { ...last, vx: 0, vy: 0 } : last;
    const steer = holding ? IDLE : air ? airSteer(this.cfg, dir) : dir;
    const to = stopAt(stepGhost(this.cfg, from, steer, dt), others, 2 * this.cfg.ghostRadius);
    this.path.push({ at: now, ...to });
    while ((this.path[0]?.at ?? now) < now - HISTORY_MS) this.path.shift();
    this.correct(server, dt);
  }

  // The dash that goes in this frame: a press at once, or with the wind-up on held until its
  // end (none if the ghost went up meanwhile); a press during a wind-up does nothing.
  private dashNow(
    now: number,
    air: boolean,
    pressed: { x: number; y: number } | null,
  ): { x: number; y: number } | null {
    if (this.wind) {
      if (now < this.wind.until) return null;
      const { v } = this.wind;
      this.wind = null;
      return air ? null : v;
    }
    if (!pressed || this.cfg.dashWindUpMs === 0) return pressed;
    this.wind = { until: now + this.cfg.dashWindUpMs, v: pressed };
    return null;
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
