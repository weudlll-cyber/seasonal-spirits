// Seasonal Sumo — the own character's marks, so the player always finds it (FIX 2026-11-17-3;
// Sky Island look 2026-11-18): a white ring on the ground under it with an ink edge, a white
// triangle with an ink outline pointing down at it from above, the ring pulsing outwards after
// a respawn and at the start of a match, and — while it is out — its team's respawn band drawn
// faintly (the match's respawnBand, render shape.ts). Sizes in pixels, so they read on desktop
// and phone.

import { QUARTER, teamAngle, type Team } from '@seasonal-spirits/game-core';
import type { WireDisc } from '@seasonal-spirits/protocol';
import { look, seasonColour } from './palette.js';
import { shape } from './shape.js';
import { VIEW_TILT, sx, sy, type View } from './view.js';

const RING_WIDTH = 4;
const POINTER_GAP = 6; // px between what the character reaches up to and the triangle's tip
const POINTER_HEIGHT = 12;
const POINTER_HALF = 8;
// How far above what the character reaches the triangle goes: what the own label keeps clear of
// (ghostReach).
export const POINTER_REACH = POINTER_GAP + POINTER_HEIGHT + 1;
export const PULSE_MS = 1500; // the pulse after a respawn and at a match start…
const PULSE_BEAT_MS = 500; // …three rings, each growing and fading
const PULSE_GROW = 22; // px a pulse ring grows

// The ring on the ground under a body of radius `r` px standing at (x, y) field units; `pulseMs`:
// time since the pulse began, or null.
export function drawOwnRing(
  v: View,
  at: { x: number; y: number; r: number },
  pulseMs: number | null,
): void {
  const { ctx } = v;
  const l = look();
  const ring = (grow: number): void => {
    const rx = at.r * 1.3 + grow;
    ctx.beginPath();
    ctx.ellipse(sx(v, at.x), sy(v, at.y) + at.r, rx, rx * 0.42, 0, 0, Math.PI * 2);
  };
  ring(0);
  ctx.lineWidth = RING_WIDTH + 3;
  ctx.strokeStyle = l.ink;
  ctx.stroke();
  ctx.lineWidth = RING_WIDTH;
  ctx.strokeStyle = l.marker;
  ctx.stroke();
  if (pulseMs === null || pulseMs < 0 || pulseMs >= PULSE_MS) return;
  const beat = (pulseMs % PULSE_BEAT_MS) / PULSE_BEAT_MS;
  ctx.globalAlpha = 1 - beat;
  ctx.lineWidth = 3;
  ring(PULSE_GROW * beat);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The triangle above a character whose drawing reaches `top` px above its body's centre at
// (x, y) field units.
export function drawOwnPointer(v: View, at: { x: number; y: number; top: number }): void {
  const { ctx } = v;
  const l = look();
  const x = sx(v, at.x);
  const tip = sy(v, at.y) - at.top - POINTER_GAP;
  ctx.beginPath();
  ctx.moveTo(x, tip);
  ctx.lineTo(x - POINTER_HALF, tip - POINTER_HEIGHT);
  ctx.lineTo(x + POINTER_HALF, tip - POINTER_HEIGHT);
  ctx.closePath();
  ctx.fillStyle = l.marker;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = l.ink;
  ctx.stroke();
}

// While the own ghost is out: where it comes back — its team's quarter of the arena from the
// inner to the outer share of the radius, faint in the team's colour with a dashed edge.
export function drawRespawnBand(v: View, area: WireDisc, team: Team): void {
  const { ctx } = v;
  const { inner, outer } = shape().respawnBand;
  const spread = QUARTER;
  const from = teamAngle(team) - spread / 2;
  const to = from + spread;
  // Built lying on the ground (squashed by the view's tilt); the path outlives the transform.
  ctx.save();
  ctx.translate(sx(v, area.x), sy(v, area.y));
  ctx.scale(1, VIEW_TILT);
  ctx.beginPath();
  ctx.arc(0, 0, area.r * outer * v.scale, from, to);
  ctx.arc(0, 0, area.r * inner * v.scale, to, from, true);
  ctx.closePath();
  ctx.restore();
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
