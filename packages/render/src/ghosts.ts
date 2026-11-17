// Seasonal Sumo — the ghosts in Seasonal Spirits' look B: the body in its team's colour,
// players and bots alike; the own one drawn on top of all with its marks (own.ts). A fast ghost
// — dashing or knocked flying — leaves a short trail in its team's colour; a ghost falling off
// the arena shrinks and fades (fallMs); one out is not drawn; one just back (protected) wears a
// pale dashed ring; one in the air after a jump rises on an arc over its shadow, its label and
// marks with it, with a ground ring at take-off and landing and "Dodged!" when a dash passed
// under it (jump.ts); a bomb carrier has the ticking bomb above it (bomb.ts). What the drawing
// remembers between frames is trails.ts.

import {
  GHOST_AIRBORNE,
  GHOST_BOMB,
  GHOST_FALLING,
  GHOST_OUT,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { bombReach, drawBomb } from './bomb.js';
import {
  LABEL_HEIGHT,
  labelText,
  placeLabels,
  type LabelCandidate,
  type PlacedLabel,
} from './labels.js';
import {
  AIR_TOP_SCALE,
  airScale,
  arcHeight,
  drawDodged,
  drawGroundRing,
  drawShadow,
  lifted,
} from './jump.js';
import { OWN_REACH, drawOwnMarks } from './own.js';
import { MUTED, TEXT, seasonColour } from './palette.js';
import { shape } from './shape.js';
import type { Trails } from './trails.js';
import { circle, sx, sy, visibleArea, type View } from './view.js';

// A ghost faster than running can make it leaves a trail: a dash or a knock.
const trailSpeed = (): number => shape().maxSpeed * 1.1;

export interface GhostStyle {
  ownId: number | null; // the ghost this client steers, marked clearly
  trails: Trails;
  nowMs: number; // drives the fall animation
  labelAll: boolean; // every ghost named (spectators, the viewer)
  fuse: number; // the bombs' fuse: 1 full … 0 going off (fuseLeft in modes.ts)
  ownPulseMs?: number | null; // since the own ghost's pulse began (own.ts), null: none
  // King of the Season's zone: inside it the crowd is labelled by its short tags only (NIGHT
  // 2026-11-18: full names piled up there), full names outside; the own ghost stays "You".
  zone?: { x: number; y: number; r: number } | null;
}

export function ghostRadiusPx(v: View): number {
  // The match's size; at least 4 px, so a ghost stays visible on a small phone.
  return Math.max(4, shape().ghostRadius * v.scale);
}

const visible = (g: GhostState): boolean => !(g.flags & GHOST_OUT);

// A ghost as drawn: `g` lifted on its jump's arc at height `h` (0 on the ground), `real` where it
// is — its shadow, trail and ground ring stay there.
interface Aloft {
  g: GhostState;
  real: GhostState;
  h: number;
}

function aloft(g: GhostState, style: GhostStyle): Aloft {
  const t = style.trails.air(g.id, style.nowMs, shape().jump.airMs);
  if (t === null) return { g, real: g, h: 0 };
  const h = arcHeight(t);
  return { g: { ...g, ...lifted(g, h) }, real: g, h };
}

// Returns the labels as drawn (the client's browser specs read them).
export function drawGhosts(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  const shown = ghosts.filter(visible).map((g) => aloft(g, style));
  for (const { real, h } of shown) {
    if (Math.hypot(real.vx, real.vy) > trailSpeed() && !(real.flags & GHOST_FALLING)) {
      drawTrail(v, real, style.trails);
    }
    // On the ground: the shadow of one in the air, the ring of a take-off or a landing.
    if (h > 0) drawShadow(v, real, ghostRadiusPx(v), h);
    const ring = style.trails.ring(real.id, style.nowMs);
    if (ring !== null) drawGroundRing(v, real, ghostRadiusPx(v), ring);
  }
  // The own ghost last: on top of every other (FIX 2026-11-17-3).
  const own = shown.filter((d) => d.g.id === style.ownId);
  for (const d of [...shown.filter((d) => d.g.id !== style.ownId), ...own]) drawBody(v, d, style);
  const labels = drawLabels(
    v,
    shown.map((d) => d.g).filter((g) => !(g.flags & GHOST_FALLING)),
    style,
  );
  for (const { g, h } of shown) {
    const t = style.trails.dodged(g.id, style.nowMs);
    if (t !== null) drawDodged(v, g, ghostRadiusPx(v) * airScale(h), t);
  }
  return labels;
}

function drawTrail(v: View, g: GhostState, trails: Trails): void {
  const pts = trails.of(g.id);
  const { ctx } = v;
  ctx.strokeStyle = seasonColour(g.team);
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    ctx.globalAlpha = (i / pts.length) * 0.5;
    ctx.lineWidth = Math.max(2, ghostRadiusPx(v) * (i / pts.length));
    ctx.beginPath();
    ctx.moveTo(sx(v, a.x), sy(v, a.y));
    ctx.lineTo(sx(v, b.x), sy(v, b.y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Pixels outside the body to the protection ring's centre line; ghostReach adds half its width.
const PROTECT_RING = 9;

function drawBody(v: View, d: Aloft, style: GhostStyle): void {
  const { ctx } = v;
  const { g } = d;
  const fall = g.flags & GHOST_FALLING ? style.trails.fall(g.id, style.nowMs) : 0;
  const r = ghostRadiusPx(v) * (1 - 0.8 * fall) * airScale(d.h);
  ctx.globalAlpha = 1 - 0.8 * fall;
  ctx.fillStyle = seasonColour(g.team);
  circle(v, g.x, g.y, r);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (fall > 0) return;
  if (g.flags & GHOST_PROTECTED) {
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    circle(v, g.x, g.y, r + PROTECT_RING);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (g.id === style.ownId) drawOwnMarks(v, { x: g.x, y: g.y, r }, style.ownPulseMs ?? null);
  if (g.flags & GHOST_BOMB) drawBomb(v, { x: g.x, y: g.y, r }, style.fuse, style.nowMs);
}

// How far from the centre drawBody draws for a ghost of body radius `r` pixels: what its label
// keeps clear of (LabelCandidate.r); a bomb above it counts in full.
export function ghostReach(
  r: number,
  g: Pick<GhostState, 'id' | 'flags'>,
  ownId: number | null,
): number {
  const outside = [
    g.id === ownId ? OWN_REACH : 0,
    g.flags & GHOST_PROTECTED ? PROTECT_RING + 1 : 0,
    g.flags & GHOST_BOMB ? bombReach(r) - r : 0,
    g.flags & GHOST_AIRBORNE ? r * (AIR_TOP_SCALE - 1) : 0,
  ];
  return r + Math.max(...outside);
}

const labelFont = (own: boolean): string => `${own ? 'bold ' : ''}12px system-ui, sans-serif`;

// Every ghost on screen is named (owner's observation 2026-11-15: unnamed dots), with its tag
// as the fallback in a crowd (labelText, placeLabels: labels.ts).
function candidateOf(v: View, g: GhostState, style: GhostStyle): LabelCandidate {
  const { ctx } = v;
  const own = g.id === style.ownId;
  const text = labelText(g, own, style.labelAll);
  const z = style.zone;
  const crowded = !own && z && Math.hypot(g.x - z.x, g.y - z.y) <= z.r;
  const { tag } = text;
  const full = crowded ? tag : text.full;
  ctx.font = labelFont(own);
  return {
    id: g.id,
    x: sx(v, g.x),
    y: sy(v, g.y),
    r: ghostReach(ghostRadiusPx(v), g, style.ownId),
    full,
    fullWidth: ctx.measureText(full).width,
    tag,
    tagWidth: ctx.measureText(tag).width,
    own,
    score: g.score,
  };
}

function drawLabels(v: View, ghosts: readonly GhostState[], style: GhostStyle): PlacedLabel[] {
  const { ctx } = v;
  const area = visibleArea(v);
  const shown = (c: LabelCandidate): boolean =>
    c.x >= area.left && c.x <= area.right && c.y >= area.top && c.y <= area.bottom;
  const candidates = ghosts.map((g) => candidateOf(v, g, style)).filter(shown);
  const placed = placeLabels(candidates, area);
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 1;
  for (const p of placed) {
    if (!p.leader) continue;
    ctx.beginPath();
    ctx.moveTo(p.leader.x, p.leader.y);
    ctx.lineTo(p.x, p.y - LABEL_HEIGHT / 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT;
  for (const p of placed) {
    ctx.font = labelFont(p.own);
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.textAlign = 'start';
  return placed;
}
