// Seasonal Sumo — sumo's halving on screen (Sky Island look, 2026-11-18): the island's outer ring
// breaks into chunks — grass, dirt and rock — that drop and shrink towards the sea over about a
// second, while the server eases the edge in to the new size. Watches the arena's radius the
// states bring: a drop starts the break (no event to miss between two frames).

import type { WireDisc } from '@seasonal-spirits/protocol';
import { look } from './palette.js';
import { sx, sy, type View } from './view.js';

const BREAK_MS = 1000;
const CHUNKS = 10;

interface Break {
  at: number; // when it began, ms
  x: number;
  y: number;
  from: number; // the ring between the old edge and the new, field units
  to: number;
}

export class BreakOff {
  private top = 0; // the largest radius since the last break: a new match grows it again
  private running: Break | null = null;

  // Every frame, with the arena as the newest state has it (null outside sumo) and the
  // match's shrink per halving (sumo.shrink).
  observe(area: WireDisc | null, nowMs: number, shrink: number): void {
    if (!area) {
      this.top = 0;
      this.running = null;
      return;
    }
    if (area.r >= this.top) this.top = area.r;
    else if (area.r < this.top - 1) {
      // The edge started easing in: the ring from the old edge to the new one breaks off.
      this.running = { at: nowMs, x: area.x, y: area.y, from: this.top, to: this.top * shrink };
      this.top = this.top * shrink;
    }
    if (this.running && nowMs - this.running.at >= BREAK_MS) this.running = null;
  }

  // The chunks behind the island (its back half) or in front of it.
  draw(v: View, nowMs: number, side: 'behind' | 'front'): void {
    const b = this.running;
    if (!b) return;
    const t = Math.min(1, (nowMs - b.at) / BREAK_MS);
    for (let i = 0; i < CHUNKS; i++) {
      if (Math.sin(angleOf(i)) < 0 === (side === 'behind')) chunk(v, b, t, i);
    }
  }
}

// Chunk `i`'s place round the ring, a little uneven.
const angleOf = (i: number): number => ((i + 0.5) / CHUNKS) * Math.PI * 2 + (i % 2) * 0.12;

// Chunk `i`: a piece of the ring, dropped and shrunk by `t` (0 … 1).
function chunk(v: View, b: Break, t: number, i: number): void {
  const { ctx } = v;
  const a = angleOf(i);
  const l = look();
  const span = (Math.PI * 2 * 0.46) / CHUNKS;
  const corner = (r: number, da: number): [number, number] => [
    sx(v, b.x + Math.cos(a + da) * r),
    sy(v, b.y + Math.sin(a + da) * r),
  ];
  // Its top: the old edge's arc outside, a jagged break inside.
  const left = corner(b.from, -span);
  const right = corner(b.from, span);
  const mid = (b.from + b.to) / 2;
  const pts = [
    left,
    corner(b.from, -span / 2),
    corner(b.from, 0),
    corner(b.from, span / 2),
    right,
    corner(mid, span * 0.8),
    corner(b.to, span * 0.3),
    corner(mid + (b.from - b.to) * 0.15, -span * 0.2),
    corner(b.to, -span * 0.7),
  ];
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const scale = 1 - 0.75 * t;
  const drop = t * t * ctx.canvas.height * 0.5 + t * 20 * ((i % 3) - 1);
  const thick = (b.from - b.to) * v.scale * v.tilt * 0.6;
  ctx.save();
  ctx.translate(cx, cy + drop);
  ctx.rotate(t * (i % 2 ? 1.2 : -1.2));
  ctx.scale(scale, scale);
  ctx.globalAlpha = 1 - 0.4 * t;
  const face = (dy: number): void => {
    ctx.beginPath();
    for (const [x, y] of pts) ctx.lineTo(x - cx, y - cy + dy);
    ctx.closePath();
  };
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = l.ink;
  // The rock under it, then the dirt, then the grass on top.
  ctx.fillStyle = l.rock;
  ctx.beginPath();
  ctx.moveTo(left[0] - cx, left[1] - cy + thick);
  ctx.lineTo(0, thick * 2.6);
  ctx.lineTo(right[0] - cx, right[1] - cy + thick);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  face(thick);
  ctx.fillStyle = l.dirt;
  ctx.fill();
  ctx.stroke();
  face(0);
  ctx.fillStyle = l.grass;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
