// Seasonal Sumo — the ghosts in Seasonal Spirits' look B: the body in its team's colour,
// players and bots alike, a thick white ring for "You". A fast ghost — dashing or knocked
// flying — leaves a short trail in its team's colour; a ghost falling off the arena shrinks and
// fades (fallMs); one out is not drawn; one just back (protected) wears a pale dashed ring; a
// bomb carrier has the ticking bomb above it (bomb.ts).

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import {
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
import { MUTED, TEXT, seasonColour } from './palette.js';
import { circle, sx, sy, visibleArea, type View } from './view.js';

const TRAIL_POINTS = 12;
// A ghost faster than running can make it leaves a trail: a dash or a knock.
const TRAIL_SPEED = DEFAULT_CONFIG.maxSpeed * 1.1;

// The last few positions of each ghost, for the trails, and when each began to fall, for the
// fall animation. Bounded by the ghost ids.
export class Trails {
  private readonly points = new Map<number, { x: number; y: number }[]>();
  private readonly fellAt = new Map<number, number>();

  record(ghosts: readonly GhostState[], nowMs: number): void {
    const seen = new Set<number>();
    for (const g of ghosts) {
      seen.add(g.id);
      const list = this.points.get(g.id) ?? [];
      list.push({ x: g.x, y: g.y });
      if (list.length > TRAIL_POINTS) list.shift();
      this.points.set(g.id, list);
      if (!(g.flags & GHOST_FALLING)) this.fellAt.delete(g.id);
      else if (!this.fellAt.has(g.id)) this.fellAt.set(g.id, nowMs);
    }
    for (const id of this.points.keys()) if (!seen.has(id)) this.points.delete(id);
    for (const id of this.fellAt.keys()) if (!seen.has(id)) this.fellAt.delete(id);
  }

  of(id: number): readonly { x: number; y: number }[] {
    return this.points.get(id) ?? [];
  }

  // 0 just fallen … 1 gone.
  fall(id: number, nowMs: number): number {
    const at = this.fellAt.get(id);
    return at === undefined ? 0 : Math.min(1, (nowMs - at) / DEFAULT_CONFIG.fallMs);
  }
}

export interface GhostStyle {
  ownId: number | null; // the ghost this client steers, marked clearly
  trails: Trails;
  nowMs: number; // drives the fall animation
  labelAll: boolean; // every ghost named (spectators, the viewer)
  fuse: number; // the bombs' fuse: 1 full … 0 going off (fuseLeft in modes.ts)
}

export function ghostRadiusPx(v: View): number {
  // The game core's size; at least 4 px, so a ghost stays visible on a small phone.
  return Math.max(4, DEFAULT_CONFIG.ghostRadius * v.scale);
}

const visible = (g: GhostState): boolean => !(g.flags & GHOST_OUT);

// Returns the labels as drawn (the client's browser specs read them).
export function drawGhosts(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  const shown = ghosts.filter(visible);
  for (const g of shown) {
    if (Math.hypot(g.vx, g.vy) > TRAIL_SPEED && !(g.flags & GHOST_FALLING)) {
      drawTrail(v, g, style.trails);
    }
  }
  for (const g of shown) drawBody(v, g, style);
  return drawLabels(
    v,
    shown.filter((g) => !(g.flags & GHOST_FALLING)),
    style,
  );
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

// Pixels outside the body: the own ghost's ring and the protection ring (each line's centre).
// ghostReach adds half a line width for the outer edge.
const OWN_RING = 4;
const PROTECT_RING = 9;

function drawBody(v: View, g: GhostState, style: GhostStyle): void {
  const { ctx } = v;
  const fall = g.flags & GHOST_FALLING ? style.trails.fall(g.id, style.nowMs) : 0;
  const r = ghostRadiusPx(v) * (1 - 0.8 * fall);
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
  if (g.id === style.ownId) {
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 3;
    circle(v, g.x, g.y, r + OWN_RING);
    ctx.stroke();
  }
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
    g.id === ownId ? OWN_RING + 1.5 : 0,
    g.flags & GHOST_PROTECTED ? PROTECT_RING + 1 : 0,
    g.flags & GHOST_BOMB ? bombReach(r) - r : 0,
  ];
  return r + Math.max(...outside);
}

const labelFont = (own: boolean): string => `${own ? 'bold ' : ''}12px system-ui, sans-serif`;

// Every ghost on screen is named (owner's observation 2026-11-15: unnamed dots), with its tag
// as the fallback in a crowd (labelText, placeLabels: labels.ts).
function candidateOf(v: View, g: GhostState, style: GhostStyle): LabelCandidate {
  const { ctx } = v;
  const own = g.id === style.ownId;
  const { full, tag } = labelText(g, own, style.labelAll);
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
