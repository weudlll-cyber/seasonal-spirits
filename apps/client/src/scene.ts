// Seasonal Sumo — one frame of the canvas: the whole playing area fitted below the band, its
// ghosts and labels, the own ghost's marks (its pulse; its respawn band while out), and the
// season clock. Returns what it drew, for the browser specs.

import { DEFAULT_CONFIG, type Team } from '@seasonal-spirits/game-core';
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
  drawRespawnBand,
  drawGhosts,
  fitBox,
  fuseLeft,
  ghostRadiusPx,
  playBox,
  sx,
  sy,
  visibleArea,
  type PlacedLabel,
  type Rect,
  type Trails,
  type View,
} from '@seasonal-spirits/render';
import type { HudOnField } from './hud.js';

// Pixels of the band under the season clock: the team line, the corner buttons and the team
// scores (index.html #band). Every client has it, so no control sits on the field.
export const BAND_HEIGHT = 68;
const MARGIN_PX = 8; // between the playing area (and a ghost on its edge) and the screen's edge

export interface Frame {
  ghosts: GhostState[];
  latest: ServerState | undefined;
  ownId: number | null;
  own: GhostState | undefined;
  ownTeam: number | null; // a player's team; null for spectators
  playing: boolean;
  over: boolean;
  hud: HudOnField; // the HUD controls and thumb zones on the field (hud.ts)
  marks: OwnMarks;
  airMs: number; // a jump's time in the air (the server's tuning): the arc it is drawn on
}

// When the own ghost needs finding (own-marker.ts): its pulse, and while it is out after a
// fall, the time until it is back.
export interface OwnMarks {
  pulseMs: number | null;
  backInMs: number | null;
}
export const NO_MARKS: OwnMarks = { pulseMs: null, backInMs: null };

export interface Drawn {
  barBottom: number; // pixels: nothing of the field is drawn above this line
  playArea: Rect; // the playing area's square (sumo: around the arena) in pixels
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

// One camera for every mode and every client (owner 2026-11-17: only half the arena showed in
// the old "Near" view): the whole playing area below the band, clear of the Dash button and the
// joystick's thumb zone, with room for a ghost standing on its edge. In sumo it follows the
// arena's edge in after a halving, so the smaller arena stays large on screen.
export function camera(
  ctx: CanvasRenderingContext2D,
  s: ServerState | undefined,
  zones: readonly Rect[],
): View {
  const box = playBox(s);
  const fitted = { ...box, half: box.half + DEFAULT_CONFIG.ghostRadius };
  return fitBox(ctx, CLOCK_HEIGHT + BAND_HEIGHT, fitted, { keepOut: zones, marginPx: MARGIN_PX });
}

// The playing area's square on screen.
export function playArea(view: View, s: ServerState | undefined): Rect {
  const b = playBox(s);
  return {
    left: sx(view, b.x - b.half),
    top: sy(view, b.y - b.half),
    right: sx(view, b.x + b.half),
    bottom: sy(view, b.y + b.half),
  };
}

export function drawScene(ctx: CanvasRenderingContext2D, f: Frame, trails: Trails): Drawn {
  const view = camera(ctx, f.latest, f.hud.zones);
  const now = performance.now();
  ctx.fillStyle = '#05080b';
  ctx.fillRect(0, 0, ctx.canvas.width, view.top);
  trails.record(f.ghosts, now);
  let labels: PlacedLabel[] = [];
  belowBar(view, () => {
    drawField(view, f.latest);
    const area = f.latest?.area;
    if (f.marks.backInMs !== null && f.ownTeam !== null && area)
      drawRespawnBand(view, area, f.ownTeam as Team);
    labels = drawGhosts(view, f.ghosts, {
      ownId: f.ownId,
      trails,
      nowMs: now,
      labelAll: !f.playing,
      fuse: f.latest ? fuseLeft(f.latest) : 1,
      ownPulseMs: f.marks.pulseMs,
      airMs: f.airMs,
    });
  });
  drawClock(ctx, f.latest);
  return {
    barBottom: view.top,
    playArea: playArea(view, f.latest),
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
