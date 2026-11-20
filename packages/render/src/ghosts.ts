// Seasonal Sumo — the ghosts as the Sky Island look's characters (owner's choice 2026-11-18): a
// character in its team's colour and season hat (character.ts, cached by sprites.ts), players
// and bots alike, back to front by where they stand, each over a soft shadow, facing the side it
// walks to with a bob and stepping feet; the own one drawn after every other character, glowing,
// its ring on the ground, its arrow above all of the field and an arrow at the screen's edge when
// it is off screen (own.ts; owner 2026-11-20). A fast one — dashing or knocked flying — leaves three white puffs; one falling off
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
// no body cut anywhere, the own one last; over them the hit stars and the puffs, King's crown, the
// season's particles, the labels (ghost-labels.ts) and "Dodged!" — none in the own arrow's box —
// and over everything the own arrow. A character off
// Sumo's island — falling, or in the air beyond its edge — has its standing size and no marks on
// the ground; one off its back is drawn behind the island's body (drawFallsBehind, before the
// island; planner 2026-11-20). What the drawing remembers between frames is trails.ts.

import {
  GHOST_BOMB,
  GHOST_FALLING,
  GHOST_NO_RETURN,
  GHOST_OUT,
  GHOST_PROTECTED,
  type GhostState,
  type WireDisc,
} from '@seasonal-spirits/protocol';
import { drawBomb, drawCarrier } from './bomb.js';
import { inkWidth } from './character.js';
import { drawDust, drawStar } from './effects.js';
import { drawFall, offBack, offIsland } from './fall.js';
import { drawLabels } from './ghost-labels.js';
import { drawNoReturn } from './no-return.js';
import {
  airScale,
  arcHeight,
  DODGED_BOX,
  clearBubble,
  dodgedAt,
  dodgedBox,
  drawDodged,
  drawGroundRing,
  drawShadow,
  lifted,
} from './jump.js';
import type { PlacedLabel } from './labels.js';
import { fastSpeed } from './moments.js';
import { drawOwnMarker, drawOwnOffScreen, drawOwnRing, ownMarkerBox } from './own.js';
import { look } from './palette.js';
import { PROTECT_RING, ghostRadiusPx, ghostReach } from './reach.js';
import { shape } from './shape.js';
import { drawSprite } from './sprites.js';
import type { FieldStanding, Standing } from './standing.js';
import type { Trails } from './trails.js';
import { byDepth, circle, overlaps, sx, sy, type Rect, type View } from './view.js';
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
  // Sumo's island top (field.ts islandOf), null in the walled modes: who is off it, who off its
  // back (fall.ts).
  island?: WireDisc | null;
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
  if (offIsland(g, style.island ?? null)) return { g, real: g, h: 0 }; // over nothing: no arc
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
  const front = (g: GhostState): boolean => visible(g) && !offBack(g, style.island ?? null);
  const shown = ghosts.filter(front).map((g) => aloft(v, g, style));
  for (const d of shown) drawGround(v, d, style);
  const own = shown.find((d) => d.g.id === style.ownId) ?? null;
  const top = drawStanding(v, shown, style);
  drawOverBodies(v, shown, style);
  const mark = own && top !== null ? { x: own.g.x, y: own.g.y, top, team: own.g.team } : null;
  const box = mark ? ownMarkerBox(v, mark) : null;
  const labels = drawLabels(
    v,
    shown.map((d) => d.g).filter((g) => !(g.flags & GHOST_FALLING)),
    style,
    box,
  );
  drawBubbles(v, shown, style, box);
  // The own arrow over everything of the field: only the HUD and the banners come over it.
  if (mark) drawOwnMarker(v, mark, mark.team, style.nowMs);
  const ownGhost = ghosts.find((g) => g.id === style.ownId && visible(g));
  if (ownGhost) drawOwnOffScreen(v, ownGhost, ownGhost.team);
  return labels;
}

// Over the bodies: the hit stars and the puffs, King's crown, the season's particles.
function drawOverBodies(v: View, shown: readonly Aloft[], style: GhostStyle): void {
  for (const { g, real } of shown) {
    const star = style.trails.moments.star(g.id, style.nowMs);
    if (star) drawStar(v, star, ghostRadiusPx(v), star.t);
    if (!(real.flags & GHOST_FALLING) && Math.hypot(real.vx, real.vy) > fastSpeed())
      drawPuffs(v, real, style.trails, ghostRadiusPx(v));
  }
  style.field?.over(); // King's crown: over the stars (p18, 2026-11-19: stars hid it)
  style.air?.();
}

// "Dodged!" never over another one, and none in the own arrow's `box` (left out when it would
// be); the own one beside the arrow, on its left (the own label sits on its right).
function drawBubbles(v: View, shown: readonly Aloft[], style: GhostStyle, box: Rect | null): void {
  const bubbles: { x: number; y: number }[] = [];
  const ownFirst = [...shown].sort(
    (a, b) => Number(b.g.id === style.ownId) - Number(a.g.id === style.ownId),
  );
  for (const { g, h } of ownFirst) {
    const t = style.trails.dodged(g.id, style.nowMs);
    if (t === null) continue;
    const own = box !== null && g.id === style.ownId;
    const at = own
      ? { x: box.left - DODGED_BOX.width / 2 - 4, y: (box.top + box.bottom) / 2 }
      : clearBubble(dodgedAt(v, g, ghostRadiusPx(v) * airScale(h), t), bubbles);
    if (!at || (!own && box && overlaps(box, dodgedBox(at)))) continue;
    drawDodged(v.ctx, at, t);
    bubbles.push(at);
  }
}

// Whether a character stands on the ground it is over: not falling, not off Sumo's island.
const onGround = (g: GhostState, style: GhostStyle): boolean =>
  !(g.flags & GHOST_FALLING) && !offIsland(g, style.island ?? null);

// On the ground under a character: its shadow, the ring of a take-off or a landing, its dust.
function drawGround(v: View, { real, h }: Aloft, style: GhostStyle): void {
  if (!onGround(real, style)) return;
  const r = ghostRadiusPx(v);
  drawShadow(v, real, r, h);
  const ring = style.trails.ring(real.id, style.nowMs);
  if (ring !== null) drawGroundRing(v, real, r, ring);
  const dust = style.trails.moments.dust(real.id, style.nowMs);
  if (dust !== null) drawDust(v, real, r, dust);
}

// The characters off the back of Sumo's island, back to front: drawn before the island's body
// (field.ts drawField `behind`), which hides them as they drop.
export function drawFallsBehind(v: View, ghosts: readonly GhostState[], style: GhostStyle): void {
  const back = ghosts.filter((g) => visible(g) && offBack(g, style.island ?? null));
  for (const g of [...back].sort((a, b) => a.y - b.y)) drawBody(v, { g, real: g, h: 0 }, style);
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
// body by its centre, where it stands even in the air); the own one after all of them, so no
// other character or piece ever covers it (owner 2026-11-20), its ring right before it, over the
// others' feet (2026-11-20 capture: in a crowd those standing in front hid it). Returns how far the own drawing
// reaches above its centre (its arrow goes over that), null when it is not drawn standing.
function drawStanding(v: View, shown: readonly Aloft[], style: GhostStyle): number | null {
  const bodies = shown
    .filter((d) => d.g.id !== style.ownId)
    .map((d): Standing => ({
      y: sy(v, d.real.y),
      draw: () => {
        drawBody(v, d, style);
      },
    }));
  for (const piece of byDepth([...(style.field?.pieces ?? []), ...bodies])) piece.draw();
  const own = shown.find((d) => d.g.id === style.ownId);
  if (!own) return null;
  if (onGround(own.real, style)) {
    const at = { ...own.real, r: ghostRadiusPx(v) };
    drawOwnRing(v, at, style.nowMs, style.ownPulseMs ?? null);
  }
  if (drawBody(v, own, style) === null) return null;
  // The size on the ground, not a carrier's pulse: the arrow holds still over the bomb.
  return ghostReach(ghostRadiusPx(v) * airScale(own.h), own.g);
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
  const glow = g.id === style.ownId;
  drawSprite(ctx, { x: sx(v, g.x), y, r, base, left, squash, glow }, g.team, pose);
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
