// Seasonal Spirits — server-side world model.
// Pure logic: integrates each ghost's last received direction every tick, clamps to the
// world, and reports the current state. Knows nothing about sockets or inputs from clients.

import type { GhostState, ServerState } from '@seasonal-spirits/protocol';

export interface WorldOptions {
  size: number; // square world, 0..size
  speed: number; // units per second
}

interface Ghost {
  id: number;
  x: number;
  y: number;
  dx: number; // last received direction, clamped to magnitude <= 1
  dy: number;
}

export class World {
  private readonly size: number;
  private readonly speed: number;
  private readonly ghosts = new Map<number, Ghost>();
  private tickNumber = 0;
  private startMs = 0;
  private wall: (clientId: number) => number;

  constructor(opts: WorldOptions) {
    this.size = opts.size;
    this.speed = opts.speed;
    // Pseudo-random starting position seeded by client id (deterministic for the probe).
    this.wall = (id) => id;
  }

  start(nowMs: number): void {
    this.startMs = nowMs;
  }

  addGhost(id: number): void {
    if (this.ghosts.has(id)) return;
    const seed = this.wall(id);
    const x = (((seed * 9301 + 49297) % this.size) + this.size) % this.size;
    const y = (((seed * 24593 + 8521) % this.size) + this.size) % this.size;
    this.ghosts.set(id, { id, x, y, dx: 0, dy: 0 });
  }

  removeGhost(id: number): void {
    this.ghosts.delete(id);
  }

  setDirection(id: number, dx: number, dy: number): void {
    const g = this.ghosts.get(id);
    if (!g) return;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      g.dx = dx / mag;
      g.dy = dy / mag;
    } else {
      g.dx = dx;
      g.dy = dy;
    }
  }

  advance(dtMs: number, nowMs: number): ServerState {
    const dt = dtMs / 1000;
    for (const g of this.ghosts.values()) {
      g.x = clamp(g.x + g.dx * this.speed * dt, 0, this.size);
      g.y = clamp(g.y + g.dy * this.speed * dt, 0, this.size);
    }
    this.tickNumber++;
    const ghosts: GhostState[] = [];
    for (const g of this.ghosts.values()) {
      ghosts.push({ id: g.id, x: g.x, y: g.y, flags: 0 });
    }
    return { tick: this.tickNumber, serverMs: (nowMs - this.startMs) | 0, ghosts };
  }

  snapshot(nowMs: number): ServerState {
    const ghosts: GhostState[] = [];
    for (const g of this.ghosts.values()) {
      ghosts.push({ id: g.id, x: g.x, y: g.y, flags: 0 });
    }
    return { tick: this.tickNumber, serverMs: (nowMs - this.startMs) | 0, ghosts };
  }

  ghostCount(): number {
    return this.ghosts.size;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
