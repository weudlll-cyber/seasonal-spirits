// Seasonal Sumo — the small map in a corner while the phone's camera follows the own character in
// King and Bomb (2026-11-19; apps/client follow.ts): the walls as they are now, King's zone or the
// bombs' carriers, and the own dot — so the player knows where on the field the close view is.

import { GHOST_BOMB, type GhostState, type ServerState } from '@seasonal-spirits/protocol';
import { look, seasonColour } from './palette.js';
import { pillBox } from './pill.js';
import type { Box } from './view.js';

export const MINIMAP_PX = 76; // its side, pixels
const INSET = 7; // between the panel's edge and the field square

// The map in a square of MINIMAP_PX whose top right corner is (right, top), of `field` (the
// walls now); `ownId` the player's ghost.
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  at: { right: number; top: number },
  s: ServerState,
  { field, ownId }: { field: Box; ownId: number | null },
): void {
  const l = look();
  const left = at.right - MINIMAP_PX;
  pillBox(ctx, { left, top: at.top, width: MINIMAP_PX, height: MINIMAP_PX }, 10);
  const inner = MINIMAP_PX - 2 * INSET;
  const k = inner / (2 * field.half);
  const mx = (x: number): number => left + INSET + (x - field.x + field.half) * k;
  const my = (y: number): number => at.top + INSET + (y - field.y + field.half) * k;
  ctx.fillStyle = l.grass;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  ctx.fillRect(left + INSET, at.top + INSET, inner, inner);
  ctx.strokeRect(left + INSET, at.top + INSET, inner, inner);
  if (s.area) {
    ctx.fillStyle = seasonColour(s.season);
    ctx.beginPath();
    ctx.arc(mx(s.area.x), my(s.area.y), Math.max(2, s.area.r * k), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const g of s.ghosts)
    if (g.flags & GHOST_BOMB) dot(ctx, { x: mx(g.x), y: my(g.y), r: 2.5 }, l.ink);
  const own = s.ghosts.find((g: GhostState) => g.id === ownId);
  if (own) {
    dot(ctx, { x: mx(own.x), y: my(own.y), r: 4 }, seasonColour(own.team));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function dot(
  ctx: CanvasRenderingContext2D,
  d: { x: number; y: number; r: number },
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
}
