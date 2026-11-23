// Seasonal Sumo — the moments the characters' effects play from, seen in the states: dash start,
// landing, respawn and knock (faster than running without a dash). Part of trails.ts; bounded.

import {
  GHOST_AIRBORNE,
  GHOST_DASHING,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { effectMs } from './motion.js';
import { shape } from './shape.js';

const STRETCH_MS = 160;
export const SQUASH_MS = 220;
export const STAR_MS = 260;
// How near a dasher must be, in body radii, to count as the one that hit.
export const HIT_REACH = 3.5;

// A character goes faster than running can make it: a dash or a knock.
export const fastSpeed = (): number => shape().maxSpeed * 1.1;

// Knocked: faster than running without dashing or jumping (also the client's hit sound).
export const isKnocked = (g: GhostState): boolean =>
  Math.hypot(g.vx, g.vy) > fastSpeed() && !(g.flags & (GHOST_DASHING | GHOST_AIRBORNE));

export class Moments {
  private readonly dashAt = new Map<number, number>();
  private readonly squashAt = new Map<number, number>(); // a landing or a respawn
  private readonly landAt = new Map<number, number>();
  private readonly hits = new Map<number, { at: number; x: number; y: number }>();
  private readonly last = new Map<number, number>(); // the flags last seen
  private readonly sliding = new Set<number>();

  record(ghosts: readonly GhostState[], nowMs: number): void {
    const seen = new Set<number>();
    for (const g of ghosts) {
      seen.add(g.id);
      this.edges(g, nowMs);
      const slides = isKnocked(g);
      if (slides && !this.sliding.has(g.id)) this.hit(g, ghosts, nowMs);
      if (slides) this.sliding.add(g.id);
      else this.sliding.delete(g.id);
    }
    for (const ids of [this.dashAt, this.squashAt, this.landAt, this.hits, this.last]) {
      for (const id of ids.keys()) if (!seen.has(id)) ids.delete(id);
    }
    for (const id of this.sliding) if (!seen.has(id)) this.sliding.delete(id);
  }

  // A dash starting, a respawn, a landing: the flags' edges since the last state.
  private edges(g: GhostState, nowMs: number): void {
    const was = this.last.get(g.id) ?? g.flags;
    const rose = (flag: number): boolean => (g.flags & flag) !== 0 && !(was & flag);
    if (rose(GHOST_DASHING)) this.dashAt.set(g.id, nowMs);
    if (rose(GHOST_PROTECTED)) this.squashAt.set(g.id, nowMs);
    if (was & GHOST_AIRBORNE && !(g.flags & GHOST_AIRBORNE)) {
      this.squashAt.set(g.id, nowMs);
      this.landAt.set(g.id, nowMs);
    }
    this.last.set(g.id, g.flags);
  }

  // A knock began: the star at the middle to the nearest dasher, if one is near enough.
  private hit(g: GhostState, ghosts: readonly GhostState[], nowMs: number): void {
    const reach = HIT_REACH * shape().ghostRadius;
    let best: GhostState | null = null;
    for (const o of ghosts) {
      if (o.id === g.id || !(o.flags & GHOST_DASHING)) continue;
      const d = Math.hypot(o.x - g.x, o.y - g.y);
      if (d <= reach && (!best || d < Math.hypot(best.x - g.x, best.y - g.y))) best = o;
    }
    if (best) this.hits.set(g.id, { at: nowMs, x: (g.x + best.x) / 2, y: (g.y + best.y) / 2 });
  }

  // The body's width factor now: above 1 squashed (a landing, a respawn), below 1 stretched
  // upright (a dash's start); 1 when nothing plays. The height is its inverse.
  squash(id: number, nowMs: number): number {
    const s = since(this.squashAt.get(id), nowMs, effectMs(SQUASH_MS));
    if (s !== null) return 1 + 0.28 * Math.sin(Math.PI * s);
    const d = since(this.dashAt.get(id), nowMs, effectMs(STRETCH_MS));
    return d === null ? 1 : 1 - 0.2 * Math.sin(Math.PI * d);
  }

  // The dust at the feet after a landing: 0 … below 1; null when it is over.
  dust(id: number, nowMs: number): number | null {
    return since(this.landAt.get(id), nowMs, effectMs(SQUASH_MS * 1.5));
  }

  // The star of a hit: where (field units) and 0 … below 1; null when it is over.
  star(id: number, nowMs: number): { x: number; y: number; t: number } | null {
    const h = this.hits.get(id);
    const t = since(h?.at, nowMs, effectMs(STAR_MS));
    return h && t !== null ? { x: h.x, y: h.y, t } : null;
  }

  // Knocked and still sliding: spiral eyes.
  dizzy(id: number): boolean {
    return this.sliding.has(id);
  }
}

export function since(at: number | undefined, nowMs: number, ms: number): number | null {
  return at === undefined || nowMs - at >= ms || nowMs < at ? null : (nowMs - at) / ms;
}
