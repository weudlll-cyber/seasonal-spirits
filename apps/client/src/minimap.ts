// Seasonal Sumo — the minimap in "Near" (owner's play test 2026-11-15: only part of the field
// is visible): the whole field in the top right corner below the bar, with the arena's edge,
// the ghosts as tiny dots in their team colours, the own ghost, and the part of the field the
// camera shows.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { GHOST_OUT, type GhostState, type ServerState } from '@seasonal-spirits/protocol';
import { FIELD, LINE, TEXT, seasonColour, type Rect, type View } from '@seasonal-spirits/render';

const MARGIN = 10;

// Just below the bar, top right; about a quarter of the shorter screen side.
export function minimapRect(width: number, height: number, top: number): Rect {
  const size = Math.round(Math.min(180, Math.max(96, Math.min(width, height - top) * 0.28)));
  const left = width - MARGIN - size;
  return { left, top: top + MARGIN, right: left + size, bottom: top + MARGIN + size };
}

export interface MinimapInput {
  state: ServerState | undefined;
  ghosts: readonly GhostState[];
  ownId: number | null;
  camera: View; // the main view, for the outline of what it shows
}

export function drawMinimap(ctx: CanvasRenderingContext2D, at: Rect, m: MinimapInput): void {
  const size = at.right - at.left;
  const k = size / FIELD;
  const px = (x: number): number => at.left + x * k;
  const py = (y: number): number => at.top + y * k;
  const dot = (x: number, y: number, r: number): void => {
    ctx.beginPath();
    ctx.arc(px(x), py(y), r, 0, Math.PI * 2);
  };
  ctx.fillStyle = 'rgba(5, 8, 11, 0.82)';
  ctx.fillRect(at.left, at.top, size, size);
  const c = DEFAULT_CONFIG.fieldSize / 2;
  dot(c, c, (m.state?.arenaRadius ?? DEFAULT_CONFIG.arenaRadius) * k);
  ctx.strokeStyle = seasonColour(m.state?.season ?? 0);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (const g of m.ghosts) {
    if (g.id === m.ownId || g.flags & GHOST_OUT) continue;
    dot(g.x, g.y, 1.6);
    ctx.fillStyle = seasonColour(g.team);
    ctx.fill();
  }
  const own = m.ghosts.find((g) => g.id === m.ownId);
  if (own) {
    dot(own.x, own.y, 3.5);
    ctx.fillStyle = TEXT;
    ctx.fill();
  }
  // What the camera shows, clipped to the field.
  const v = m.camera;
  const x0 = Math.max(0, -v.ox / v.scale);
  const y0 = Math.max(0, (v.top - v.oy) / v.scale);
  const x1 = Math.min(FIELD, (ctx.canvas.width - v.ox) / v.scale);
  const y1 = Math.min(FIELD, (ctx.canvas.height - v.oy) / v.scale);
  ctx.strokeStyle = 'rgba(230, 237, 243, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px(x0), py(y0), (x1 - x0) * k, (y1 - y0) * k);
  ctx.strokeStyle = LINE;
  ctx.strokeRect(at.left, at.top, size, size);
}
