// Seasonal Sumo — King of the Season's zone on the island (field.ts draws it in hill): on the
// ground, under everything that stands, a soft glow in the season's colour, slowly pulsing, with
// an ink ring and, in the countdown, its next place dashed with a faint fill; small flags on poles
// standing on the ring, each in the depth order with the characters (standing.ts), their heads
// above a character's hat so a full zone still shows them over the crowd; a gold crown floating
// over its middle, over everything (owner 2026-11-19: the ring lay over the characters). And where
// the island's trees, pebbles and lanterns keep off: the zone, its next place and the four places
// it can jump to (zoneKeepOut).

import { quarterCentre, type Team } from '@seasonal-spirits/game-core';
import type { ServerState, WireDisc } from '@seasonal-spirits/protocol';
import type { Ellipse } from './island.js';
import { zoneOf } from './modes.js';
import { REACH } from './character.js';
import { ambientMs } from './motion.js';
import { look } from './palette.js';
import { ghostRadiusPx } from './reach.js';
import { shape } from './shape.js';
import type { Standing } from './standing.js';
import { groundCircle, sx, sy, type Box, type View } from './view.js';

const CROWN_GOLD = '#FFC23C';
const PULSE_MS = 2400; // one slow breath of the glow
const KEEP_OUT = 1.08; // decoration keeps this share of a zone's radius away from its middle
// A pole's height in body radii, the flag hanging from its top: the flag's lower edge stays above
// the hat (REACH.top) of a character on the ring; the camera keeps room for it above the back
// wall (field.ts cameraBox). The crown floats this many radii over the zone's middle.
export const FLAG_RISE = REACH.top + 1.1;
const CROWN_LIFT = REACH.top + 1;

// The zone now, on the ground: its glow, pulsing, and its ring.
export function drawZone(v: View, z: WireDisc, colour: string, nowMs: number): void {
  const beat = 0.5 + 0.5 * Math.sin((ambientMs(nowMs) / PULSE_MS) * Math.PI * 2);
  glow(v, z, colour, 0.85 + 0.3 * beat);
  const { ctx } = v;
  groundCircle(v, z.x, z.y, z.r);
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// The gold crown floating over the zone's middle, over everything that stands.
export function drawZoneCrown(v: View, z: WireDisc): void {
  crown(v.ctx, {
    x: sx(v, z.x),
    y: sy(v, z.y) - ghostRadiusPx(v) * CROWN_LIFT,
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

// Where no tree, pebble or lantern stands in hill (the flat decoration grows anywhere): the
// zone, its next place, and each quarter's middle at the zone's starting size, at most half the
// quarter's side (wherever it can jump), on screen; nothing in the other modes.
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

// The flags on poles round the ring, one standing piece each, sized by the zone on screen, never
// smaller than a thumb's glance reads (NIGHT 2026-11-19: on the phone they were hard to see).
// Each flies towards the zone's middle, never past the ring: the zone fits the walls exactly, so a
// flag reaching past it stood outside the fence (2026-11-19, p12, p18).
export function zonePoles(v: View, z: WireDisc, colour: string): Standing[] {
  const rx = z.r * v.scale;
  const body = ghostRadiusPx(v);
  const w = Math.max(5, Math.min(9, rx / 9, body / 2)); // half a flag's height, px
  const count = Math.max(8, Math.min(24, Math.round((2 * Math.PI * rx) / (6 * w))));
  const pole = body * FLAG_RISE; // px, foot to the flag's top
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const x = sx(v, z.x + Math.cos(a) * z.r);
    const y = sy(v, z.y + Math.sin(a) * z.r);
    const side = Math.cos(a) > 1e-9 ? -1 : 1; // which way it flies: inwards
    return {
      y,
      draw: () => {
        flag(v.ctx, { x, y, pole, w: w * side, colour });
      },
    };
  });
}

// One pole standing on (x, y), `pole` px tall, its flag `w` px long (negative: to the left).
function flag(
  ctx: CanvasRenderingContext2D,
  f: { x: number; y: number; pole: number; w: number; colour: string },
): void {
  const { x, y, pole, w, colour } = f;
  const ink = look().ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - pole);
  ctx.stroke();
  const h = Math.abs(w);
  ctx.beginPath();
  ctx.moveTo(x, y - pole);
  ctx.lineTo(x + 2 * w, y - pole + h * 0.9);
  ctx.lineTo(x, y - pole + 1.8 * h);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
