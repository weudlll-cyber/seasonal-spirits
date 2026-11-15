// Seasonal Spirits — the ghosts: team colour, and a carrier visible from afar (CONCEPT.md §2a,
// sentence 5): larger, glowing, a short trail and its name. A ring around a carrier shows its
// coins: solid for coins of the current season, dashed and grey for coins worth half now.

import { GHOST_BOT, GHOST_CARRIER, GHOST_SECURING, ghostName } from '@seasonal-spirits/protocol';
import type { GhostState } from '@seasonal-spirits/protocol';
import { LABEL_HEIGHT, placeLabels, type LabelCandidate, type PlacedLabel } from './labels.js';
import { MUTED, TEXT, seasonColour } from './palette.js';
import { circle, sx, sy, visibleArea, type View } from './view.js';

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
  season: number; // the current season, the colour of full-value coins
  trails: Trails;
  labelAll: boolean; // every ghost named (spectators, the viewer), not just carriers
}

export function ghostRadiusPx(v: View, g: GhostState): number {
  return Math.max(6, (14 + Math.min(16, g.carried / 2)) * v.scale);
}

// Returns the labels as drawn (the client's browser specs read them).
export function drawGhosts(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  for (const g of ghosts) if (g.flags & GHOST_CARRIER) drawTrail(v, g, style.trails);
  for (const g of ghosts) drawBody(v, g, style);
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

function drawBody(v: View, g: GhostState, style: GhostStyle): void {
  const { ctx } = v;
  const r = ghostRadiusPx(v, g);
  ctx.globalAlpha = g.flags & GHOST_BOT ? 0.8 : 1;
  ctx.shadowColor = seasonColour(g.team);
  ctx.shadowBlur = g.flags & GHOST_CARRIER ? Math.min(30, 6 + g.carried) : 0;
  ctx.fillStyle = seasonColour(g.team);
  circle(v, g.x, g.y, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  if (g.carried > 0) drawCoinRing(v, g, r, style.season);
  if (g.flags & GHOST_SECURING) {
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 2;
    circle(v, g.x, g.y, r + 9);
    ctx.stroke();
  }
  if (g.id === style.ownId) {
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 3;
    circle(v, g.x, g.y, r + 4);
    ctx.stroke();
  }
}

// Solid arc for the coins of the current season, dashed grey arc for the half-value ones.
function drawCoinRing(v: View, g: GhostState, r: number, season: number): void {
  const { ctx } = v;
  const full = (g.carried - g.offSeason) / g.carried;
  const start = -Math.PI / 2;
  const split = start + full * Math.PI * 2;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx(v, g.x), sy(v, g.y), r + 2, start, split);
  ctx.strokeStyle = seasonColour(season);
  ctx.stroke();
  if (g.offSeason === 0) return;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(sx(v, g.x), sy(v, g.y), r + 2, split, start + Math.PI * 2);
  ctx.strokeStyle = MUTED;
  ctx.stroke();
  ctx.setLineDash([]);
}

const labelFont = (own: boolean): string => `${own ? 'bold ' : ''}12px system-ui, sans-serif`;

// Carriers and the own ghost carry their name and coin count; others only with labelAll.
// Where they would overlap, placeLabels decides (labels.ts); a carrier's short text is its
// coin count.
function drawLabels(v: View, ghosts: readonly GhostState[], style: GhostStyle): PlacedLabel[] {
  const { ctx } = v;
  const candidates: LabelCandidate[] = [];
  for (const g of ghosts) {
    const own = g.id === style.ownId;
    if (!own && g.carried === 0 && !style.labelAll) continue;
    const name = own ? 'You' : ghostName(g.id, (g.flags & GHOST_BOT) !== 0);
    const full = g.carried > 0 ? `${name} · ${g.carried}` : name;
    const short = g.carried > 0 && !own ? String(g.carried) : null;
    const r = ghostRadiusPx(v, g);
    ctx.font = labelFont(own);
    candidates.push({
      id: g.id,
      x: sx(v, g.x),
      above: sy(v, g.y) - r - 8,
      below: sy(v, g.y) + r + 8 + LABEL_HEIGHT,
      full,
      fullWidth: ctx.measureText(full).width,
      short,
      shortWidth: short === null ? 0 : ctx.measureText(short).width,
      own,
      carried: g.carried,
    });
  }
  const placed = placeLabels(candidates, visibleArea(v));
  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT;
  for (const p of placed) {
    ctx.font = labelFont(p.own);
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.textAlign = 'start';
  return placed;
}
