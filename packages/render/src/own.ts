// Seasonal Sumo — the own character's marks, so the player always finds it (FIX 2026-11-17-3;
// owner 2026-11-20: in a crowd it was still lost): a thick ring in its team's colour on the ground,
// white-edged and ink-outlined, breathing gently; a large arrow in the team's colour pointing down
// at it from above whatever it carries, white-edged and ink-outlined like the ring (the 2026-11-20
// capture: Spring's green arrow on Spring's green grass), "YOU" over it, bobbing; the box that
// arrow keeps clear of other labels and bubbles; an arrow at the screen's edge towards it when it
// is off screen; the
// ring pulsing outwards after a respawn and at the start of a match, and — while it is out — its
// team's respawn band drawn faintly (the match's respawnBand, render shape.ts). Sizes in pixels,
// so they read on desktop and phone.

import { QUARTER, teamAngle, type Team } from '@seasonal-spirits/game-core';
import type { WireDisc } from '@seasonal-spirits/protocol';
import { look, seasonColour } from './palette.js';
import { shape } from './shape.js';
import { sx, sy, visibleArea, type Rect, type View } from './view.js';

const WHITE = '#ffffff';
const BEAT_MS = 1000; // the ring's breath and the arrow's bob: one beat
// The ring's half width in body radii: 1.6 × the body's width across.
const RING_SPAN = 1.6;
const RING_BREATH = 0.12; // the ring grows to 1.12 × its size and back each beat
// Stroke widths of the ring, px, drawn over each other: the ink outline, the white edge, the
// team's colour.
const RING_STROKES = [10, 7, 4] as const;
// The arrow above the character, px: about twice the old triangle; `gap` clears a bomb's spark.
const ARROW = { gap: 9, head: 14, half: 15, shaft: 10, shaftHalf: 6, bob: 3 } as const;
// Its edge, drawn under the fill: the ink outline (7 px wide) and the white edge inside it (4 px),
// half of each outside the shape — 2 px of white, then 1.5 px of ink.
const ARROW_STROKES = [7, 4] as const;
const ARROW_EDGE = 3.5; // px the edge reaches outside the shape
const YOU_FONT = 'bold 12px Fredoka, system-ui, sans-serif';
const YOU_HEIGHT = 12; // the text's line above the arrow
const MARKER_HALF = ARROW.half + ARROW_EDGE + 0.5; // half the box's width: the head with its edge
const MARKER_HEIGHT = ARROW.head + ARROW.shaft + ARROW_EDGE + 3 + YOU_HEIGHT;
const EDGE = { margin: 16, long: 9, wide: 8 } as const; // the off-screen arrow, px
export const PULSE_MS = 1500; // the pulse after a respawn and at a match start…
const PULSE_BEAT_MS = 500; // …three rings, each growing and fading
const PULSE_GROW = 22; // px a pulse ring grows

// 0 … 1 … 0 over one beat.
const beat = (nowMs: number): number => 0.5 - 0.5 * Math.cos((nowMs / BEAT_MS) * Math.PI * 2);

// The ring on the ground under a body of radius `r` px standing at (x, y) field units in `team`'s
// colour; `pulseMs`: time since the respawn pulse began, or null.
export function drawOwnRing(
  v: View,
  at: { x: number; y: number; r: number; team: number },
  nowMs: number,
  pulseMs: number | null,
): void {
  const { ctx } = v;
  const ring = (rx: number): void => {
    ctx.beginPath();
    ctx.ellipse(sx(v, at.x), sy(v, at.y) + at.r, rx, rx * 0.42, 0, 0, Math.PI * 2);
  };
  const rx = at.r * RING_SPAN * (1 + RING_BREATH * beat(nowMs));
  ring(rx);
  [look().ink, WHITE, seasonColour(at.team)].forEach((colour, i) => {
    ctx.lineWidth = RING_STROKES[i] ?? 1;
    ctx.strokeStyle = colour;
    ctx.stroke();
  });
  if (pulseMs === null || pulseMs < 0 || pulseMs >= PULSE_MS) return;
  const t = (pulseMs % PULSE_BEAT_MS) / PULSE_BEAT_MS;
  ctx.globalAlpha = 1 - t;
  ctx.lineWidth = 3;
  ctx.strokeStyle = WHITE;
  ring(rx + PULSE_GROW * t);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Where the arrow's tip stands, before its bob, for a character whose drawing — hat, bomb, "no
// return" mark — reaches `top` px above its body's centre at (x, y) field units; never so high
// that "YOU" goes under the top bar (the field is cut there, view.ts; the 2026-11-20 capture:
// King's zone at the top edge cut "YOU" off) — then lower, over the hat.
const tipOf = (v: View, at: { x: number; y: number; top: number }): { x: number; y: number } => ({
  x: sx(v, at.x),
  y: Math.max(sy(v, at.y) - at.top - ARROW.gap, v.top + MARKER_HEIGHT + ARROW.bob),
});

// The box the arrow and its "YOU" fill over the whole bob: no other label or bubble goes in it.
export function ownMarkerBox(v: View, at: { x: number; y: number; top: number }): Rect {
  const tip = tipOf(v, at);
  return {
    left: tip.x - MARKER_HALF,
    right: tip.x + MARKER_HALF,
    top: tip.y - MARKER_HEIGHT - ARROW.bob,
    bottom: tip.y + ARROW_EDGE,
  };
}

// The arrow in `team`'s colour over the character, "YOU" in white above it, bobbing at `nowMs`.
export function drawOwnMarker(
  v: View,
  at: { x: number; y: number; top: number },
  team: number,
  nowMs: number,
): void {
  const { ctx } = v;
  const { x, y } = tipOf(v, at);
  const tip = y - ARROW.bob * beat(nowMs);
  const neck = tip - ARROW.head;
  const end = neck - ARROW.shaft;
  ctx.beginPath();
  ctx.moveTo(x, tip);
  for (const [dx, py] of [
    [-ARROW.half, neck],
    [-ARROW.shaftHalf, neck],
    [-ARROW.shaftHalf, end],
    [ARROW.shaftHalf, end],
    [ARROW.shaftHalf, neck],
    [ARROW.half, neck],
  ] as const)
    ctx.lineTo(x + dx, py);
  ctx.closePath();
  ctx.lineJoin = 'round';
  [look().ink, WHITE].forEach((colour, i) => {
    ctx.lineWidth = ARROW_STROKES[i] ?? 1;
    ctx.strokeStyle = colour;
    ctx.stroke();
  });
  ctx.fillStyle = seasonColour(team);
  ctx.fill();
  ctx.font = YOU_FONT;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = look().ink;
  const base = end - ARROW_EDGE - 3;
  ctx.strokeText('YOU', x, base);
  ctx.fillStyle = WHITE;
  ctx.fillText('YOU', x, base);
  ctx.textAlign = 'start';
}

// When the own character at (x, y) field units is outside the visible field (a phone's follow
// camera, any camera's edge case): a small arrow in `team`'s colour at that edge, pointing to it.
// Returns whether it was drawn.
export function drawOwnOffScreen(v: View, at: { x: number; y: number }, team: number): boolean {
  const area = visibleArea(v);
  const px = sx(v, at.x);
  const py = sy(v, at.y);
  if (px >= area.left && px <= area.right && py >= area.top && py <= area.bottom) return false;
  const cx = Math.min(Math.max(px, area.left + EDGE.margin), area.right - EDGE.margin);
  const cy = Math.min(Math.max(py, area.top + EDGE.margin), area.bottom - EDGE.margin);
  const a = Math.atan2(py - cy, px - cx);
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const { ctx } = v;
  ctx.beginPath();
  ctx.moveTo(cx + c * EDGE.long, cy + s * EDGE.long);
  ctx.lineTo(cx - c * EDGE.long - s * EDGE.wide, cy - s * EDGE.long + c * EDGE.wide);
  ctx.lineTo(cx - c * EDGE.long + s * EDGE.wide, cy - s * EDGE.long - c * EDGE.wide);
  ctx.closePath();
  ctx.fillStyle = seasonColour(team);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = look().ink;
  ctx.stroke();
  return true;
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
  ctx.scale(1, v.tilt);
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
