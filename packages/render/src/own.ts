// Seasonal Sumo — the own ghost's marks, so the player always finds it (FIX 2026-11-17-3): a
// bright thick ring with a dark edge, a small arrow pointing down at it from above, a pulsing
// ring after a respawn and at the start of a match, and — while it is out — its team's respawn
// band drawn faintly (game-core RESPAWN_BAND). Sizes in pixels, so they read on desktop and phone.

import { RESPAWN_BAND, teamAngle, type Team } from '@seasonal-spirits/game-core';
import type { WireDisc } from '@seasonal-spirits/protocol';
import { seasonColour } from './palette.js';
import { circle, sx, sy, type View } from './view.js';

const BRIGHT = '#ffffff';
const EDGE = '#05080b'; // the dark edge keeps the white marks clear on any ground
export const OWN_RING = 5; // px from the body to the ring's centre line
const RING_WIDTH = 4;
const ARROW_GAP = 6; // px between the ring and the arrow's tip
const ARROW_HEIGHT = 12;
const ARROW_HALF = 8;
// How far above the body the arrow reaches: what the own label keeps clear of (ghostReach).
export const OWN_REACH = OWN_RING + RING_WIDTH / 2 + ARROW_GAP + ARROW_HEIGHT + 1;
export const PULSE_MS = 1500; // the pulse after a respawn and at a match start…
const PULSE_BEAT_MS = 500; // …three rings, each growing and fading
const PULSE_GROW = 22; // px a pulse ring grows

// The ring and the arrow around a body of radius `r` px at (x, y) field units; `pulseMs`: time
// since the pulse began, or null.
export function drawOwnMarks(
  v: View,
  body: { x: number; y: number; r: number },
  pulseMs: number | null,
): void {
  const { ctx } = v;
  const { x, y, r } = body;
  ctx.lineWidth = RING_WIDTH + 3;
  ctx.strokeStyle = EDGE;
  circle(v, x, y, r + OWN_RING);
  ctx.stroke();
  ctx.lineWidth = RING_WIDTH;
  ctx.strokeStyle = BRIGHT;
  circle(v, x, y, r + OWN_RING);
  ctx.stroke();
  const tip = sy(v, y) - r - OWN_RING - RING_WIDTH / 2 - ARROW_GAP;
  ctx.beginPath();
  ctx.moveTo(sx(v, x), tip);
  ctx.lineTo(sx(v, x) - ARROW_HALF, tip - ARROW_HEIGHT);
  ctx.lineTo(sx(v, x) + ARROW_HALF, tip - ARROW_HEIGHT);
  ctx.closePath();
  ctx.fillStyle = BRIGHT;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = EDGE;
  ctx.stroke();
  if (pulseMs === null || pulseMs < 0 || pulseMs >= PULSE_MS) return;
  const beat = (pulseMs % PULSE_BEAT_MS) / PULSE_BEAT_MS;
  ctx.globalAlpha = 1 - beat;
  ctx.lineWidth = 3;
  ctx.strokeStyle = BRIGHT;
  circle(v, x, y, r + OWN_RING + PULSE_GROW * beat);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// While the own ghost is out: where it comes back — its team's quarter of the arena from the
// inner to the outer share of the radius, faint in the team's colour with a dashed edge.
export function drawRespawnBand(v: View, area: WireDisc, team: Team): void {
  const { ctx } = v;
  const { spread, inner, outer } = RESPAWN_BAND;
  const from = teamAngle(team) - spread / 2;
  const to = from + spread;
  const cx = sx(v, area.x);
  const cy = sy(v, area.y);
  ctx.beginPath();
  ctx.arc(cx, cy, area.r * outer * v.scale, from, to);
  ctx.arc(cx, cy, area.r * inner * v.scale, to, from, true);
  ctx.closePath();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = seasonColour(team);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = seasonColour(team);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
