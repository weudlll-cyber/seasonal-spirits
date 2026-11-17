// Seasonal Sumo — one frame of the canvas: the arena, ghosts and labels below the top bar, the
// season clock, and in "Near" the minimap. Returns what it drew, for the browser specs.

import {
  GHOST_FALLING,
  GHOST_OUT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  belowBar,
  drawClock,
  drawField,
  drawGhosts,
  fuseLeft,
  fitField,
  follow,
  ghostRadiusPx,
  sx,
  sy,
  visibleArea,
  type PlacedLabel,
  type Rect,
  type Trails,
  type View,
} from '@seasonal-spirits/render';
import { CLIENT_CONFIG } from './config.js';
import type { HudOnField } from './hud.js';
import { drawMinimap, minimapRect } from './minimap.js';
import type { ViewMode } from './view-mode.js';

// Pixels of the band under the season clock: the team line, the corner buttons and the team
// scores (index.html #band). Every client has it, so no control sits on the field.
export const BAND_HEIGHT = 68;

export interface Frame {
  ghosts: GhostState[];
  latest: ServerState | undefined;
  ownId: number | null;
  own: GhostState | undefined;
  ownTeam: number | null; // a player's team; null for spectators
  playing: boolean;
  over: boolean;
  hud: HudOnField; // the HUD controls and thumb zones on the field (hud.ts)
}

export interface Drawn {
  view: ViewMode | 'spectator';
  barBottom: number; // pixels: nothing of the field is drawn above this line
  minimap: Rect | null; // where the minimap was drawn; null outside "Near"
  controls: Rect[];
  zones: Rect[];
  labels: PlacedLabel[];
  // Every ghost drawn and named inside the visible field, in pixels: one falling off (fading)
  // or out (not drawn) has no label by design (render ghosts.ts).
  ghostsShown: GhostOnScreen[];
}

export interface GhostOnScreen {
  id: number;
  x: number;
  y: number;
  r: number; // the drawn radius
}

// "Near" follows the own ghost; a spectator, "Overview" and a player not yet placed see all.
function camera(ctx: CanvasRenderingContext2D, f: Frame, mode: ViewMode): View {
  const top = CLOCK_HEIGHT + BAND_HEIGHT;
  const followed = f.playing && mode === 'near' ? f.own : undefined;
  if (!followed) return fitField(ctx, top);
  // The field may rise above the controls at the bottom of the screen (thumb zones).
  const bottomPad = Math.max(0, ...f.hud.zones.map((z) => ctx.canvas.height - z.top));
  return follow(ctx, top, followed, { span: CLIENT_CONFIG.cameraSpan, bottomPad });
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  mode: ViewMode,
  trails: Trails,
): Drawn {
  const view = camera(ctx, f, mode);
  const near = f.playing && mode === 'near' && f.own !== undefined;
  const now = performance.now();
  ctx.fillStyle = '#05080b';
  ctx.fillRect(0, 0, ctx.canvas.width, view.top);
  trails.record(f.ghosts, now);
  let labels: PlacedLabel[] = [];
  belowBar(view, () => {
    drawField(view, f.latest);
    labels = drawGhosts(view, f.ghosts, {
      ownId: f.ownId,
      trails,
      nowMs: now,
      labelAll: !f.playing,
      fuse: f.latest ? fuseLeft(f.latest) : 1,
    });
  });
  drawClock(ctx, f.latest);
  let map: Rect | null = null;
  if (near) {
    map = minimapRect(ctx.canvas.width, ctx.canvas.height, view.top);
    drawMinimap(ctx, map, { state: f.latest, ghosts: f.ghosts, ownId: f.ownId, camera: view });
  }
  return {
    view: f.playing ? mode : 'spectator',
    barBottom: view.top,
    minimap: map,
    controls: f.hud.controls,
    zones: f.hud.zones,
    labels,
    ghostsShown: onScreen(view, f.ghosts),
  };
}

function onScreen(view: View, ghosts: readonly GhostState[]): GhostOnScreen[] {
  const area = visibleArea(view);
  return ghosts
    .filter((g) => !(g.flags & (GHOST_FALLING | GHOST_OUT)))
    .map((g) => ({ id: g.id, x: sx(view, g.x), y: sy(view, g.y), r: ghostRadiusPx(view) }))
    .filter((g) => g.x >= area.left && g.x <= area.right && g.y >= area.top && g.y <= area.bottom);
}
