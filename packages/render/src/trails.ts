// Seasonal Sumo — what the drawing remembers of each ghost between frames (positions, facing, fall,
// jump, dodge, effect moments); bounded by the ghost ids: a ghost no longer drawn is forgotten.

import {
  GHOST_AIRBORNE,
  GHOST_DODGED,
  GHOST_FALLING,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { DODGED_MS, RING_MS } from './jump.js';
import { Moments, since } from './moments.js';
import { shape } from './shape.js';

const TRAIL_POINTS = 12;
const FACE_SPEED = 20; // field units per second sideways before a character turns

export class Trails {
  private readonly points = new Map<number, { x: number; y: number }[]>();
  private readonly fellAt = new Map<number, number>();
  private readonly tookOffAt = new Map<number, number>(); // while in the air
  private readonly groundAt = new Map<number, number>(); // the last take-off or landing
  private readonly dodgedAt = new Map<number, number>();
  private readonly left = new Map<number, boolean>(); // faces left
  readonly moments = new Moments();

  record(ghosts: readonly GhostState[], nowMs: number): void {
    const seen = new Set<number>();
    for (const g of ghosts) {
      seen.add(g.id);
      const list = this.points.get(g.id) ?? [];
      list.push({ x: g.x, y: g.y });
      if (list.length > TRAIL_POINTS) list.shift();
      this.points.set(g.id, list);
      if (Math.abs(g.vx) > FACE_SPEED) this.left.set(g.id, g.vx < 0);
      this.flagMoments(g, nowMs);
    }
    this.moments.record(ghosts, nowMs);
    const all = [this.points, this.fellAt, this.tookOffAt, this.groundAt, this.dodgedAt, this.left];
    for (const ids of all) {
      for (const id of ids.keys()) if (!seen.has(id)) ids.delete(id);
    }
  }

  // When the ghost began to fall, took off, landed, and dodged a dash.
  private flagMoments(g: GhostState, nowMs: number): void {
    if (!(g.flags & GHOST_FALLING)) this.fellAt.delete(g.id);
    else if (!this.fellAt.has(g.id)) this.fellAt.set(g.id, nowMs);
    const air = (g.flags & GHOST_AIRBORNE) !== 0;
    if (air !== this.tookOffAt.has(g.id)) this.groundAt.set(g.id, nowMs);
    if (air && !this.tookOffAt.has(g.id)) this.tookOffAt.set(g.id, nowMs);
    if (!air) this.tookOffAt.delete(g.id);
    if (g.flags & GHOST_DODGED) this.dodgedAt.set(g.id, nowMs);
  }

  of(id: number): readonly { x: number; y: number }[] {
    return this.points.get(id) ?? [];
  }

  // The character faces left (it last walked left); right until it has walked.
  facesLeft(id: number): boolean {
    return this.left.get(id) ?? false;
  }

  // 0 just fallen … 1 gone.
  fall(id: number, nowMs: number): number {
    const at = this.fellAt.get(id);
    return at === undefined ? 0 : Math.min(1, (nowMs - at) / shape().fallMs);
  }

  // In the air: 0 at the take-off … 1 after `airMs`; null on the ground.
  air(id: number, nowMs: number, airMs: number): number | null {
    const at = this.tookOffAt.get(id);
    return at === undefined ? null : Math.min(1, (nowMs - at) / airMs);
  }

  // The ground ring of the last take-off or landing: 0 … below 1; null when it is over.
  ring(id: number, nowMs: number): number | null {
    return since(this.groundAt.get(id), nowMs, RING_MS);
  }

  // "Dodged!": 0 … below 1 after a dash passed under it; null when it is over.
  dodged(id: number, nowMs: number): number | null {
    return since(this.dodgedAt.get(id), nowMs, DODGED_MS);
  }
}
