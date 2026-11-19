// Seasonal Sumo — King of the Season's zone on the island (field.ts draws it in hill): a soft
// glow in the season's colour, slowly pulsing, inside an ink ring and a string of flags, with a
// gold crown in its middle (2026-11-19: the zone reads as a place to go); in the countdown its
// next place dashed with a faint fill. And where the island's decoration keeps off: the zone, its
// next place and the four places it can jump to (zoneKeepOut).

import { quarterCentre, type Team } from '@seasonal-spirits/game-core';
import type { ServerState, WireDisc } from '@seasonal-spirits/protocol';
import type { Ellipse } from './island.js';
import { zoneOf } from './modes.js';
import { ambientMs } from './motion.js';
import { look } from './palette.js';
import { shape } from './shape.js';
import { groundCircle, sx, sy, type Box, type View } from './view.js';

const CROWN_GOLD = '#FFC23C';
const PULSE_MS = 2400; // one slow breath of the glow
const KEEP_OUT = 1.08; // decoration keeps this share of a zone's radius away from its middle

// The zone now: the glow, the ring, the flags and the crown.
export function drawZone(v: View, z: WireDisc, colour: string, nowMs: number): void {
  const { ctx } = v;
  const ink = look().ink;
  const beat = 0.5 + 0.5 * Math.sin((ambientMs(nowMs) / PULSE_MS) * Math.PI * 2);
  glow(v, z, colour, 0.85 + 0.3 * beat);
  groundCircle(v, z.x, z.y, z.r);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  flags(v, z, colour);
  crown(ctx, {
    x: sx(v, z.x),
    y: sy(v, z.y),
    size: Math.max(9, Math.min(20, z.r * v.scale * 0.16)),
  });
}

// Where the zone jumps at the halving, in its countdown: dashed, faintly filled.
export function drawNextZone(v: View, z: WireDisc, colour: string): void {
  const { ctx } = v;
  groundCircle(v, z.x, z.y, z.r);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.setLineDash([12, 9]);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);
}

// Where no decoration stands in hill: the zone, its next place, and each quarter's middle at the
// zone's starting size, at most half the quarter's side (wherever it can jump), on screen;
// nothing in the other modes.
export function zoneKeepOut(v: View, box: Box, s: ServerState | undefined): Ellipse[] {
  const zone = zoneOf(s);
  if (!zone) return [];
  const r = Math.min(shape().hill.zoneRadius, box.half / 2);
  const quarters = ([0, 1, 2, 3] as const).map((t: Team) => ({
    ...quarterCentre(box, box.half, t),
    r,
  }));
  return [zone, s?.next ?? null, ...quarters]
    .filter((d): d is WireDisc => d !== null)
    .map((d) => ({
      x: sx(v, d.x),
      y: sy(v, d.y),
      rx: d.r * KEEP_OUT * v.scale,
      ry: d.r * KEEP_OUT * v.scale * v.tilt,
    }));
}

// The glow: the colour over the whole zone (about a quarter strong) and once more in its middle,
// so it is brightest there (`k` the pulse's strength).
function glow(v: View, z: WireDisc, colour: string, k: number): void {
  const { ctx } = v;
  ctx.fillStyle = colour;
  for (const [share, alpha] of [
    [1, 0.25],
    [0.55, 0.12],
  ] as const) {
    groundCircle(v, z.x, z.y, z.r * share);
    ctx.globalAlpha = alpha * k;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The ring of flags, sized by the zone on screen, never smaller than a thumb's glance reads
// (NIGHT 2026-11-19: on the phone they were hard to see). Each hangs with its tip on the ring,
// never below it: the zone fits the walls exactly, so a flag hanging past the ring stood outside
// the near fence (2026-11-19, p12).
function flags(v: View, z: WireDisc, colour: string): void {
  const { ctx } = v;
  const rx = z.r * v.scale;
  const w = Math.max(5, Math.min(9, rx / 9)); // half a flag's width, px
  const count = Math.max(8, Math.min(40, Math.round((2 * Math.PI * rx) / (3.2 * w))));
  ctx.fillStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = look().ink;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = sx(v, z.x + Math.cos(a) * z.r);
    const y = sy(v, z.y + Math.sin(a) * z.r) - 1.8 * w;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + 1.8 * w);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// A small gold crown standing on (x, y), `size` half its width in pixels.
function crown(ctx: CanvasRenderingContext2D, c: { x: number; y: number; size: number }): void {
  const { x, y, size: s } = c;
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x - s, y - 1.1 * s);
  ctx.lineTo(x - 0.5 * s, y - 0.55 * s);
  ctx.lineTo(x, y - 1.35 * s);
  ctx.lineTo(x + 0.5 * s, y - 0.55 * s);
  ctx.lineTo(x + s, y - 1.1 * s);
  ctx.lineTo(x + s, y);
  ctx.closePath();
  ctx.fillStyle = CROWN_GOLD;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = look().ink;
  ctx.stroke();
  ctx.lineJoin = 'miter';
}
