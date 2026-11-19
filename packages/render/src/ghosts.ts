// Seasonal Sumo — the ghosts as the Sky Island look's characters (owner's choice 2026-11-18): a
// character in its team's colour and season hat (character.ts, cached by sprites.ts), players
// and bots alike, back to front by where they stand, each over a soft shadow, facing the side it
// walks to with a bob and stepping feet; the own one's ring on the ground and triangle above
// (own.ts). A fast one — dashing or knocked flying — leaves three white puffs; one falling off
// tips over the edge into the sea (fall.ts); one out is not drawn; one just back (protected)
// wears a white dashed ring; one in the air after a jump rises on an arc while its shadow stays
// on the ground, with a ground ring at take-off and landing and "Dodged!" when a dash passed
// under it (jump.ts); a bomb carrier pulses in a hot halo under the ticking bomb (bomb.ts), one
// that just passed a bomb on wears the "no return" mark while it may not take it back
// (no-return.ts); a dash
// winding up glows with its line (windup.ts). A dash's start stretches the body, a landing or a
// respawn squashes it, a landing kicks up dust, a hit shows a white star and the knocked one
// slides with spiral eyes (moments.ts, effects.ts). Layers (owner 2026-11-19): the ground marks
// under every character (shadows, rings, dust); the bodies in one depth order with what stands on
// the island — trees, pebbles, lanterns, fence posts and rails, King's flag poles (standing.ts),
// no body cut anywhere; over everything the own triangle, the hit stars and the puffs, King's
// crown, the season's particles, the labels (ghost-labels.ts) and "Dodged!". What the drawing remembers between frames is
// trails.ts.

import {
  GHOST_BOMB,
  GHOST_FALLING,
  GHOST_NO_RETURN,
  GHOST_OUT,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { drawBomb, drawCarrier } from './bomb.js';
import { inkWidth } from './character.js';
import { drawDust, drawStar } from './effects.js';
import { drawFall } from './fall.js';
import { drawLabels } from './ghost-labels.js';
import { drawNoReturn } from './no-return.js';
import {
  airScale,
  arcHeight,
  clearBubble,
  dodgedAt,
  drawDodged,
  drawGroundRing,
  drawShadow,
  lifted,
} from './jump.js';
import type { PlacedLabel } from './labels.js';
import { fastSpeed } from './moments.js';
import { drawOwnPointer, drawOwnRing } from './own.js';
import { look } from './palette.js';
import { PROTECT_RING, ghostRadiusPx, ghostReach } from './reach.js';
import { shape } from './shape.js';
import { drawSprite } from './sprites.js';
import type { FieldStanding, Standing } from './standing.js';
import type { Trails } from './trails.js';
import { byDepth, circle, sx, sy, type View } from './view.js';
import { drawWindUp } from './windup.js';

const WALK_SPEED = 20; // field units per second before the feet step
const STEP_MS = 140; // one step
const BOB_PX = 1.5;

export interface GhostStyle {
  ownId: number | null; // the ghost this client steers, marked clearly
  trails: Trails;
  nowMs: number; // drives the fall, the steps and the pulses
  fuse: number; // the bombs' fuse: 1 full … 0 going off (fuseLeft in modes.ts)
  ownPulseMs?: number | null; // since the own ghost's pulse began (own.ts), null: none
  // King of the Season's zone: inside it the crowd is labelled by its short tags only (NIGHT
  // 2026-11-18: full names piled up there), full names outside; the own ghost stays "You".
  zone?: { x: number; y: number; r: number } | null;
  // Only the top N scorers and the own ghost show a score, every ghost its name (Halving Bomb:
  // 3, scoreTopOf in modes.ts); null: every score shows.
  scoreTop?: number | null;
  // What stands on the island, sorted in with the bodies, and what floats over all of it
  // (standing.ts fieldStanding); absent: the bodies alone.
  field?: FieldStanding | null;
  // What flies over the island — the season's particles (season.ts drawSeasonAir) —, drawn
  // under the labels (review 2026-11-20: butterflies hid the own name).
  air?: () => void;
}

const visible = (g: GhostState): boolean => !(g.flags & GHOST_OUT);

// A ghost as drawn: `g` lifted on its jump's arc at height `h` (0 on the ground), `real` where it
// is — its shadow, puffs and ground rings stay there.
interface Aloft {
  g: GhostState;
  real: GhostState;
  h: number;
}

function aloft(v: View, g: GhostState, style: GhostStyle): Aloft {
  const t = style.trails.air(g.id, style.nowMs, shape().jump.airMs);
  if (t === null) return { g, real: g, h: 0 };
  const h = arcHeight(t);
  return { g: { ...g, ...lifted(v, g, h) }, real: g, h };
}

// Returns the labels as drawn (the client's browser specs read them).
export function drawGhosts(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  const shown = ghosts.filter(visible).map((g) => aloft(v, g, style));
  for (const d of shown) drawGround(v, d, style);
  drawStanding(v, shown, style);
  for (const { g, real } of shown) {
    const star = style.trails.moments.star(g.id, style.nowMs);
    if (star) drawStar(v, star, ghostRadiusPx(v), star.t);
    if (!(real.flags & GHOST_FALLING) && Math.hypot(real.vx, real.vy) > fastSpeed())
      drawPuffs(v, real, style.trails, ghostRadiusPx(v));
  }
  style.field?.over(); // King's crown: over the stars (p18, 2026-11-19: stars hid it)
  style.air?.();
  const labels = drawLabels(
    v,
    shown.map((d) => d.g).filter((g) => !(g.flags & GHOST_FALLING)),
    style,
  );
  const bubbles: { x: number; y: number }[] = []; // "Dodged!" never over another one
  for (const { g, h } of shown) {
    const t = style.trails.dodged(g.id, style.nowMs);
    const at =
      t === null ? null : clearBubble(dodgedAt(v, g, ghostRadiusPx(v) * airScale(h), t), bubbles);
    if (t !== null && at) {
      drawDodged(v.ctx, at, t);
      bubbles.push(at);
    }
  }
  return labels;
}

// On the ground under a character: its shadow, the ring of a take-off or a landing, its dust, and
// for the own one its ring.
function drawGround(v: View, { real, h }: Aloft, style: GhostStyle): void {
  if (real.flags & GHOST_FALLING) return;
  const r = ghostRadiusPx(v);
  drawShadow(v, real, r, h);
  const ring = style.trails.ring(real.id, style.nowMs);
  if (ring !== null) drawGroundRing(v, real, r, ring);
  const dust = style.trails.moments.dust(real.id, style.nowMs);
  if (dust !== null) drawDust(v, real, r, dust);
  if (real.id === style.ownId) drawOwnRing(v, { ...real, r }, style.ownPulseMs ?? null);
}

// Three white puffs behind a fast character at places it just passed, fading away from it.
function drawPuffs(v: View, g: GhostState, trails: Trails, r: number): void {
  const { ctx } = v;
  const l = look();
  const pts = trails.of(g.id);
  ctx.strokeStyle = l.ink;
  ctx.fillStyle = l.puff;
  ctx.lineWidth = inkWidth(r) * 0.8;
  [3, 6, 9].forEach((back, i) => {
    const p = pts[pts.length - 1 - back];
    if (!p) return;
    ctx.globalAlpha = 0.9 - 0.25 * i;
    ctx.beginPath();
    ctx.arc(sx(v, p.x), sy(v, p.y) + r * 0.7, r * (0.48 - 0.1 * i), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

// The bodies and the island's standing pieces back to front by where they stand on the ground (a
// body by its centre, where it stands even in the air); the own one's triangle over all of them,
// so it is always found (FIX 2026-11-17-3).
function drawStanding(v: View, shown: readonly Aloft[], style: GhostStyle): void {
  const own: { at: { x: number; y: number; top: number } | null } = { at: null };
  const bodies = shown.map((d): Standing => ({
    y: sy(v, d.real.y),
    draw: () => {
      const r = drawBody(v, d, style);
      if (d.g.id === style.ownId && r !== null) {
        own.at = { x: d.g.x, y: d.g.y, top: ghostReach(r, d.g, null) };
      }
    },
  }));
  for (const piece of byDepth([...(style.field?.pieces ?? []), ...bodies])) piece.draw();
  if (own.at) drawOwnPointer(v, own.at);
}

// Returns the body's drawn radius, or null while it falls (no marks then).
function drawBody(v: View, d: Aloft, style: GhostStyle): number | null {
  const { ctx } = v;
  const { g, real, h } = d;
  const base = ghostRadiusPx(v);
  const left = style.trails.facesLeft(g.id);
  if (g.flags & GHOST_FALLING) {
    const at = { x: sx(v, g.x), y: sy(v, g.y), r: base, team: g.team, left };
    drawFall(ctx, at, style.trails.fall(g.id, style.nowMs));
    return null;
  }
  // A carrier pulses in its halo; the bomb above keeps to the body's own size.
  const carrier = (g.flags & GHOST_BOMB) !== 0;
  const at = { x: g.x, y: g.y, r: base * airScale(h) };
  const r = carrier ? drawCarrier(v, at, style.fuse, style.nowMs) : at.r;
  // A dash winding up: its glow behind the body and its line (windup.ts).
  if (g.windUp !== null) drawWindUp(v, { x: g.x, y: g.y, r }, g.windUp);
  const walking = h === 0 && Math.hypot(real.vx, real.vy) > WALK_SPEED;
  const beat = style.nowMs / STEP_MS + g.id * 0.37;
  const bob = walking ? Math.sin(beat * Math.PI) * BOB_PX : 0;
  const moments = style.trails.moments;
  const step = Math.floor(beat) % 2 ? 'stepA' : 'stepB';
  const pose = moments.dizzy(g.id) ? 'dizzy' : walking ? step : 'idle';
  const y = sy(v, g.y) - Math.abs(bob);
  const squash = moments.squash(g.id, style.nowMs);
  drawSprite(ctx, { x: sx(v, g.x), y, r, base, left, squash }, g.team, pose);
  if (g.flags & GHOST_PROTECTED) {
    ctx.strokeStyle = look().puff;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    circle(v, g.x, g.y, r + PROTECT_RING);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (carrier) drawBomb(v, at, style.fuse, style.nowMs);
  if (g.flags & GHOST_NO_RETURN) drawNoReturn(v, at, carrier);
  return r;
}
