// Seasonal Spirits — one frame of the canvas: field, ghosts and labels below the top bar, the
// season clock, and in "Near" the minimap and the "Your shrine" arrow. Shrine labels and the
// arrow keep out of the thumb zones of the HUD controls. Returns what it drew, for the
// browser specs.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import type { CoinState, GhostState, ServerState } from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  circle,
  SHRINES,
  belowBar,
  drawClock,
  drawField,
  drawGhosts,
  fitField,
  follow,
  seasonColour,
  sx,
  sy,
  visibleArea,
  type PlacedLabel,
  type Rect,
  type Trails,
  type View,
} from '@seasonal-spirits/render';
import { drawArrow, edgeArrow, type EdgeArrow } from './arrow.js';
import { CLIENT_CONFIG } from './config.js';
import type { HudOnField } from './hud.js';
import { drawMinimap, minimapRect } from './minimap.js';
import type { ViewMode } from './view-mode.js';

// Pixels of the band under the season clock: the team line and the corner buttons
// (index.html #band). Every client has it, so no control sits on the field.
export const BAND_HEIGHT = 40;
// What "Near" adds: the minimap and the shrine arrow, where they were drawn.
interface NearExtras {
  map: Rect | null;
  arrow: EdgeArrow | null;
}
const NOTHING_NEAR: NearExtras = { map: null, arrow: null };
const ARROW_INSET = 34; // pixels between the screen edge and the shrine arrow

export interface Frame {
  ghosts: GhostState[];
  latest: ServerState | undefined;
  coins: CoinState[]; // the field coins at the moment the ghosts are drawn at (main.ts)
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
  arrow: boolean;
  arrowAt: { x: number; y: number } | null;
  shrineOnScreen: boolean; // the own shrine with its "Your shrine" label is in sight
  shrineLabel: Rect | null; // where "Your shrine" was drawn on the field
  controls: Rect[];
  zones: Rect[];
  labels: PlacedLabel[];
  stealRing: boolean; // the own steal range is drawn (an opponent carrier is near)
  ghostsShown: GhostOnScreen[]; // every ghost drawn inside the visible field, in pixels
}

export interface GhostOnScreen {
  id: number;
  carried: number;
  x: number;
  y: number;
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
  ctx.fillStyle = '#05080b';
  ctx.fillRect(0, 0, ctx.canvas.width, view.top);
  trails.record(f.ghosts);
  let labels: PlacedLabel[] = [];
  let shrineLabel: Rect | null = null;
  let stealRing = false;
  belowBar(view, () => {
    const field = { ownTeam: f.ownTeam, nowMs: performance.now(), blocked: f.hud.controls };
    shrineLabel = drawField(view, f.latest && { ...f.latest, coins: f.coins }, field);
    stealRing = drawStealRing(view, f);
    const style = { ownId: f.ownId, season: f.latest?.season ?? 0, trails, labelAll: !f.playing };
    labels = drawGhosts(view, f.ghosts, style);
  });
  drawClock(ctx, f.latest);
  const shrine = ownShrine(view, f.ownTeam);
  const { map, arrow } = near && shrine ? drawNear(ctx, view, f, shrine) : NOTHING_NEAR;
  const shrineOnScreen = shrine !== null && edgeArrow(shrine.screen, shrine.at, 0) === null;
  return {
    view: f.playing ? mode : 'spectator',
    barBottom: view.top,
    minimap: map,
    arrow: arrow !== null,
    arrowAt: arrow && { x: arrow.x, y: arrow.y },
    shrineOnScreen,
    shrineLabel: shrineOnScreen ? shrineLabel : null,
    controls: f.hud.controls,
    zones: f.hud.zones,
    labels,
    ghostsShown: onScreen(view, f.ghosts),
    stealRing,
  };
}

// The own steal range as a faint ring while an opponent carrier is near (within twice the
// range): what a press of Steal can reach (owner's observation 2026-11-15). Players only.
function drawStealRing(view: View, f: Frame): boolean {
  const own = f.playing ? f.own : undefined;
  if (!own) return false;
  const range = DEFAULT_CONFIG.stealRange;
  const near = f.ghosts.some(
    (g) =>
      g.team !== own.team && g.carried > 0 && Math.hypot(g.x - own.x, g.y - own.y) <= 2 * range,
  );
  if (!near) return false;
  const { ctx } = view;
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  circle(view, own.x, own.y, range * view.scale);
  ctx.stroke();
  ctx.setLineDash([]);
  return true;
}

interface OwnShrine {
  team: number;
  at: { x: number; y: number }; // pixels
  screen: Rect; // the part of the canvas below the bar
}

function ownShrine(view: View, team: number | null): OwnShrine | null {
  const home = team === null ? undefined : SHRINES[team];
  if (team === null || !home) return null;
  return { team, at: { x: sx(view, home.x), y: sy(view, home.y) }, screen: visibleArea(view) };
}

// The minimap, and the arrow when the own shrine is out of sight, clear of the minimap and
// the thumb zones.
function drawNear(
  ctx: CanvasRenderingContext2D,
  view: View,
  f: Frame,
  shrine: OwnShrine,
): NearExtras {
  const map = minimapRect(ctx.canvas.width, ctx.canvas.height, view.top, shrine.team);
  drawMinimap(ctx, map, {
    state: f.latest,
    ghosts: f.ghosts,
    ownId: f.ownId,
    ownTeam: shrine.team,
    camera: view,
  });
  const arrow = edgeArrow(shrine.screen, shrine.at, ARROW_INSET, [map, ...f.hud.zones]);
  if (arrow) drawArrow(ctx, arrow, seasonColour(shrine.team));
  return { map, arrow };
}

function onScreen(view: View, ghosts: readonly GhostState[]): GhostOnScreen[] {
  const area = visibleArea(view);
  return ghosts
    .map((g) => ({ id: g.id, carried: g.carried, x: sx(view, g.x), y: sy(view, g.y) }))
    .filter((g) => g.x >= area.left && g.x <= area.right && g.y >= area.top && g.y <= area.bottom);
}
