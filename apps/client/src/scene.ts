// Seasonal Sumo — one frame of the canvas: the sky, the whole playing area — the island —
// fitted below the band (on a portrait phone in King and Bomb the follow camera and its minimap,
// follow.ts), its ghosts and labels, the own ghost's marks (its pulse; its respawn band while
// out), and the season clock; characters off the island's back before the island, which hides
// them. Returns what it drew, for the browser specs.

import type { Settings, Team } from '@seasonal-spirits/game-core';
import {
  GHOST_BOT,
  GHOST_FALLING,
  GHOST_OUT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  belowBar,
  drawSky,
  drawSeasonAir,
  drawClock,
  drawField,
  fieldStanding,
  drawRespawnBand,
  drawFallsBehind,
  drawGhosts,
  drawMinimap,
  fitBox,
  fuseLeft,
  scoreTopOf,
  zoneOf,
  ghostRadiusPx,
  cameraBox,
  islandOf,
  playBox,
  sx,
  sy,
  visibleArea,
  type FieldMemory,
  type GhostStyle,
  type PlacedLabel,
  type Rect,
  type Trails,
  type View,
} from '@seasonal-spirits/render';
import { CameraEase, followView, followWanted } from './follow.js';
import type { HudOnField } from './hud.js';

// Pixels of the band under the season clock: the team line, the corner buttons and the team
// scores (index.html #band). Every client has it, so no control sits on the field. 78 px since
// the kit's game bar (its phone targets 44 px; 68 before, night chain 2026-11-21).
const BAND_HEIGHT = 78;
// In King a row under the band for the hint pill (zone-hint.ts, index.html #hint), kept whether
// it shows or not so the camera never jumps: the pill over the back fence hid it (2026-11-19).
// A spectator's "Watching the match." notice sits in the same row (index.html #notice.row).
const HINT_ROW = 24;
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
  tuning: Settings | null; // the server's settings in force (development), for the follow camera
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
  minimap: Rect | null; // the follow camera's minimap on screen, null while it is not drawn
  playArea: Rect; // the playing area's square (sumo: around the arena) in pixels
  controls: Rect[];
  zones: Rect[];
  labels: PlacedLabel[];
  // Every ghost drawn inside the visible field, in pixels, with what decides whether it is named
  // (render ghost-labels.ts): one falling off or out has no label by design.
  ghostsShown: GhostOnScreen[];
}

export interface GhostOnScreen {
  id: number;
  x: number;
  y: number;
  r: number; // the drawn radius
  bot: boolean;
  score: number;
}

// One camera for every mode and every client (owner 2026-11-17: only half the arena showed in
// the old "Near" view): the whole playing area below the band, clear of the Dash button and the
// joystick's thumb zone, with room for a ghost standing on its edge and the fence (render
// cameraBox). In sumo it follows the arena's edge in after a halving, so the smaller arena stays
// large on screen, up to the zoom cap (render BODY_SHARE). On a portrait phone the controls may
// cover the sky and the rock, never the playing surface, and the view turns steeper to fill the
// height (render fitBox). `playing` false: a spectator's view, with the notice's row.
export function camera(
  ctx: CanvasRenderingContext2D,
  s: ServerState | undefined,
  zones: readonly Rect[],
  playing = true,
): View {
  const top = fieldTop(s, playing);
  const room = { keepOut: zones, marginPx: MARGIN_PX };
  return fitBox(ctx, top, cameraBox(s, { ctx, top, room }), room);
}

// Pixels from the screen's top to where the field may begin: below the clock and the band, and
// in King, and for anyone not playing, below the row of the hint or the "Watching" notice.
export function fieldTop(s: ServerState | undefined, playing = true): number {
  return CLOCK_HEIGHT + BAND_HEIGHT + (zoneOf(s) || !playing ? HINT_ROW : 0);
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

// What the drawing remembers between frames: the ghosts' (render trails.ts), the island's
// halving (render breakoff.ts) and the season's fade (render season.ts).
export interface Memory extends FieldMemory {
  trails: Trails;
  camera: CameraEase;
}

// The frame's view: the whole playing area (camera), or on a portrait phone in King and Bomb the
// follow camera, eased (follow.ts); `follow` whether it follows the own character.
function viewOf(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  memory: Memory,
  now: number,
): { view: View; follow: boolean } {
  const whole = camera(ctx, f.latest, f.hud.zones, f.playing);
  const input = { s: f.latest, own: f.own, tuning: f.tuning };
  if (!f.latest || !f.own || !followWanted(ctx, input)) {
    memory.camera.reset();
    return { view: whole, follow: false };
  }
  const room = { keepOut: f.hud.zones, marginPx: MARGIN_PX };
  const followed = followView(ctx, fieldTop(f.latest), room, { s: f.latest, own: f.own });
  return { view: memory.camera.ease(followed ?? whole, now), follow: followed !== null };
}

// Where the follow camera's minimap stands: top right under the band, and below the halving's
// banner (its bottom `banner`) while it shows, never under it (p20, 2026-11-19).
export function minimapAt(
  width: number,
  top: number,
  banner: number | null,
): { right: number; top: number } {
  return { right: width - MARGIN_PX, top: Math.max(top, banner ?? 0) + MARGIN_PX };
}

export function drawScene(ctx: CanvasRenderingContext2D, f: Frame, memory: Memory): Drawn {
  const now = performance.now();
  const { view, follow } = viewOf(ctx, f, memory, now);
  const { trails } = memory;
  drawSky(ctx, now, f.latest?.season);
  trails.record(f.ghosts, now);
  let labels: PlacedLabel[] = [];
  belowBar(view, () => {
    const style: GhostStyle = {
      ownId: f.ownId,
      trails,
      nowMs: now,
      fuse: f.latest ? fuseLeft(f.latest) : 1,
      ownPulseMs: f.marks.pulseMs,
      zone: zoneOf(f.latest),
      scoreTop: scoreTopOf(f.latest),
      island: islandOf(f.latest),
      air: () => {
        drawSeasonAir(view, memory.seasons, now);
      },
    };
    const behind = (): void => {
      drawFallsBehind(view, f.ghosts, style);
    };
    const ground = drawField(view, f.latest, now, { ...memory, behind });
    const area = f.latest?.area;
    if (f.marks.backInMs !== null && f.ownTeam !== null && area)
      drawRespawnBand(view, area, f.ownTeam as Team);
    const field = fieldStanding(view, f.latest, ground, { nowMs: now, seasons: memory.seasons });
    labels = drawGhosts(view, f.ghosts, { ...style, field });
  });
  let minimap: Rect | null = null;
  if (follow && f.latest) {
    const at = minimapAt(ctx.canvas.width, view.top, f.hud.banner);
    minimap = drawMinimap(ctx, at, f.latest, { view, own: f.own, tuning: f.tuning });
  }
  drawClock(ctx, f.latest);
  return {
    barBottom: view.top,
    minimap,
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
    .map((g) => ({
      id: g.id,
      x: sx(view, g.x),
      y: sy(view, g.y),
      r: ghostRadiusPx(view),
      bot: (g.flags & GHOST_BOT) !== 0,
      score: g.score,
    }))
    .filter((g) => g.x >= area.left && g.x <= area.right && g.y >= area.top && g.y <= area.bottom);
}
