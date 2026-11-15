// Seasonal Spirits — one frame of the canvas: field, ghosts and labels below the top bar, the
// season clock, and in "Near" the minimap and the "Your shrine" arrow. Returns what it drew,
// for the browser specs.

import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
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
  type PlacedLabel,
  type Trails,
  type View,
} from '@seasonal-spirits/render';
import { drawArrow, edgeArrow, type Rect } from './arrow.js';
import { CLIENT_CONFIG } from './config.js';
import { drawMinimap, minimapRect } from './minimap.js';
import type { ViewMode } from './view-mode.js';

export const TEAM_BAND = 40; // pixels of "You are Team <Season>" under the season clock
const ARROW_INSET = 34; // pixels between the screen edge and the shrine arrow

export interface Frame {
  ghosts: GhostState[];
  latest: ServerState | undefined;
  ownId: number | null;
  own: GhostState | undefined;
  ownTeam: number | null; // a player's team; null for spectators
  playing: boolean;
  over: boolean;
}

export interface Drawn {
  view: ViewMode | 'spectator';
  barBottom: number; // pixels: nothing of the field is drawn above this line
  minimap: boolean;
  arrow: boolean;
  shrineOnScreen: boolean; // the own shrine with its "Your shrine" label is in sight
  labels: PlacedLabel[];
}

// "Near" follows the own ghost; a spectator, "Overview" and a player not yet placed see all.
function camera(ctx: CanvasRenderingContext2D, f: Frame, mode: ViewMode): View {
  const top = f.ownTeam === null ? CLOCK_HEIGHT : CLOCK_HEIGHT + TEAM_BAND;
  const followed = f.playing && mode === 'near' ? f.own : undefined;
  return followed ? follow(ctx, top, followed, CLIENT_CONFIG.cameraSpan) : fitField(ctx, top);
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
  belowBar(view, () => {
    drawField(view, f.latest, { ownTeam: f.ownTeam, nowMs: performance.now() });
    const style = { ownId: f.ownId, season: f.latest?.season ?? 0, trails, labelAll: !f.playing };
    labels = drawGhosts(view, f.ghosts, style);
  });
  drawClock(ctx, f.latest);
  const shrine = ownShrine(ctx, view, f.ownTeam);
  const arrow = near && shrine ? drawNear(ctx, view, f, shrine) : false;
  return {
    view: f.playing ? mode : 'spectator',
    barBottom: view.top,
    minimap: near && shrine !== null,
    arrow,
    shrineOnScreen: shrine !== null && edgeArrow(shrine.screen, shrine.at, 0) === null,
    labels,
  };
}

interface OwnShrine {
  team: number;
  at: { x: number; y: number }; // pixels
  screen: Rect; // the part of the canvas below the bar
}

function ownShrine(
  ctx: CanvasRenderingContext2D,
  view: View,
  team: number | null,
): OwnShrine | null {
  const home = team === null ? undefined : SHRINES[team];
  if (team === null || !home) return null;
  return {
    team,
    at: { x: sx(view, home.x), y: sy(view, home.y) },
    screen: { left: 0, top: view.top, right: ctx.canvas.width, bottom: ctx.canvas.height },
  };
}

// The minimap, and the arrow when the own shrine is out of sight; true if the arrow is drawn.
function drawNear(ctx: CanvasRenderingContext2D, view: View, f: Frame, shrine: OwnShrine): boolean {
  const map = minimapRect(ctx.canvas.width, ctx.canvas.height, view.top);
  drawMinimap(ctx, map, {
    state: f.latest,
    ghosts: f.ghosts,
    ownId: f.ownId,
    ownTeam: shrine.team,
    camera: view,
  });
  const arrow = edgeArrow(shrine.screen, shrine.at, ARROW_INSET, map);
  if (arrow) drawArrow(ctx, arrow, seasonColour(shrine.team));
  return arrow !== null;
}
