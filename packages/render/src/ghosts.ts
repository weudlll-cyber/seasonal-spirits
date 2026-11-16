// Seasonal Spirits — the ghosts in the look the owner chose on 2026-11-16 (look B, "calm"):
// the body in its team's colour, players and bots alike; a carrier visible from afar (CONCEPT.md
// §2a, sentence 5) by its larger body, a short trail in its team's colour and its name with the
// coin count, the half-value coins as a grey "(N half)" after it; a hexagonal shield around a
// carrier of swapped coins no steal can take, a thin ring while securing, a thick one for "You".

import { GHOST_CARRIER, GHOST_SECURING, GHOST_SHIELDED } from '@seasonal-spirits/protocol';
import { DEFAULT_CONFIG, ghostRadius } from '@seasonal-spirits/game-core';
import type { GhostState } from '@seasonal-spirits/protocol';
import {
  HALF_GAP,
  LABEL_HEIGHT,
  bodyBox,
  labelText,
  placeLabels,
  type LabelCandidate,
  type PlacedLabel,
} from './labels.js';
import { MUTED, SHIELD, TEXT, seasonColour } from './palette.js';
import { circle, sx, sy, visibleArea, type Rect, type View } from './view.js';

const TRAIL_POINTS = 12;

// The last few positions of each ghost, for the carrier trails. Bounded by the ghost ids.
export class Trails {
  private readonly points = new Map<number, { x: number; y: number }[]>();

  record(ghosts: readonly GhostState[]): void {
    const seen = new Set<number>();
    for (const g of ghosts) {
      seen.add(g.id);
      const list = this.points.get(g.id) ?? [];
      list.push({ x: g.x, y: g.y });
      if (list.length > TRAIL_POINTS) list.shift();
      this.points.set(g.id, list);
    }
    for (const id of this.points.keys()) if (!seen.has(id)) this.points.delete(id);
  }

  of(id: number): readonly { x: number; y: number }[] {
    return this.points.get(id) ?? [];
  }
}

export interface GhostStyle {
  ownId: number | null; // the ghost this client steers, marked clearly
  trails: Trails;
  labelAll: boolean; // every ghost named (spectators, the viewer), not just carriers
  avoid: readonly Rect[]; // boxes the names keep clear of: the shrine labels (drawField)
}

export function ghostRadiusPx(v: View, g: GhostState): number {
  // The game core's size (the server picks a coin up when the drawn shapes touch); at least
  // 4 px, so a ghost stays visible in a phone's Overview, the only view that small.
  return Math.max(4, ghostRadius(DEFAULT_CONFIG, g.carried) * v.scale);
}

// Every ghost's body box in pixels, as drawGhosts draws it: what the shrine labels keep off.
export function ghostBodies(v: View, ghosts: readonly GhostState[]): Rect[] {
  return ghosts.map((g) => bodyBox({ x: sx(v, g.x), y: sy(v, g.y), r: ghostRadiusPx(v, g) }));
}

// Returns the labels as drawn (the client's browser specs read them).
export function drawGhosts(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  for (const g of ghosts) if (g.flags & GHOST_CARRIER) drawTrail(v, g, style.trails);
  for (const g of ghosts) drawBody(v, g, style.ownId);
  return drawLabels(v, ghosts, style);
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
    ctx.lineWidth = Math.max(2, ghostRadiusPx(v, g) * (i / pts.length));
    ctx.beginPath();
    ctx.moveTo(sx(v, a.x), sy(v, a.y));
    ctx.lineTo(sx(v, b.x), sy(v, b.y));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Pixels outside the body: the own ghost's ring, the shield hexagon's corners, the securing
// ring (each line's centre). ghostReach adds half a line width for the outer edge.
const OWN_RING = 4;
const SHIELD_GAP = 7;
const SECURING_RING = 9;

function drawBody(v: View, g: GhostState, ownId: number | null): void {
  const { ctx } = v;
  const r = ghostRadiusPx(v, g);
  ctx.fillStyle = seasonColour(g.team);
  circle(v, g.x, g.y, r);
  ctx.fill();
  if (g.flags & GHOST_SHIELDED) drawShield(v, g, r);
  if (g.flags & GHOST_SECURING) {
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 2;
    circle(v, g.x, g.y, r + SECURING_RING);
    ctx.stroke();
  }
  if (g.id === ownId) {
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 3;
    circle(v, g.x, g.y, r + OWN_RING);
    ctx.stroke();
  }
}

// How far from the centre drawBody draws for a ghost of body radius `r` pixels: what its label
// keeps clear of (LabelCandidate.r).
export function ghostReach(
  r: number,
  g: Pick<GhostState, 'id' | 'flags'>,
  ownId: number | null,
): number {
  const outside = [
    g.id === ownId ? OWN_RING + 1.5 : 0,
    g.flags & GHOST_SHIELDED ? SHIELD_GAP + 1 : 0,
    g.flags & GHOST_SECURING ? SECURING_RING + 1 : 0,
  ];
  return r + Math.max(...outside);
}

// A hexagon around the body: a shape no other ring has, so it reads as "protected".
function drawShield(v: View, g: GhostState, r: number): void {
  const { ctx } = v;
  const cx = sx(v, g.x);
  const cy = sy(v, g.y);
  const outer = r + SHIELD_GAP;
  ctx.strokeStyle = SHIELD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const [x, y] = [cx + outer * Math.cos(a), cy + outer * Math.sin(a)];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
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
    r: ghostReach(ghostRadiusPx(v, g), g, style.ownId),
    full,
    fullWidth: ctx.measureText(full).width,
    tag,
    tagWidth: ctx.measureText(tag).width,
    own,
    carried: g.carried,
  };
}

function drawLabels(v: View, ghosts: readonly GhostState[], style: GhostStyle): PlacedLabel[] {
  const { ctx } = v;
  const area = visibleArea(v);
  const shown = (c: LabelCandidate): boolean =>
    c.x >= area.left && c.x <= area.right && c.y >= area.top && c.y <= area.bottom;
  const candidates = ghosts.map((g) => candidateOf(v, g, style)).filter(shown);
  const placed = placeLabels(candidates, area, style.avoid);
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
    drawLabelText(ctx, p);
  }
  ctx.textAlign = 'start';
  return placed;
}

// The label's text centred on its spot; the half-value count after HALF_GAP in MUTED.
function drawLabelText(ctx: CanvasRenderingContext2D, p: PlacedLabel): void {
  const cut = p.text.indexOf(HALF_GAP);
  if (cut < 0) {
    ctx.fillText(p.text, p.x, p.y);
    return;
  }
  const main = p.text.slice(0, cut);
  const left = p.x - p.width / 2;
  ctx.textAlign = 'start';
  ctx.fillText(main, left, p.y);
  ctx.fillStyle = MUTED;
  ctx.fillText(p.text.slice(cut), left + ctx.measureText(main).width, p.y);
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
}
