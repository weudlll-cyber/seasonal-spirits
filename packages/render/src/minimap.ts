// Seasonal Sumo — the small map in a corner while the phone's camera follows the own character in
// King and Bomb (apps/client follow.ts; owner 2026-11-20: it must say where the field ends and
// what the screen shows). It shows the field's edge — the walls as they stand now, shrinking on the
// map at each King halving —, a frame round the part of the field the screen shows, King's zone or
// Bomb's carriers (no other players), and the own dot in a white halo on top. Its scale is the
// walls' at the match's start, so the map never rescales. Every mark carries an ink outline: on
// some season grounds a team's colour is the ground's own (spring's green on spring grass), the
// outline still stands out (palette.test.ts: 3:1 at least).

import type { Settings } from '@seasonal-spirits/game-core';
import { GHOST_BOMB, type GhostState, type ServerState } from '@seasonal-spirits/protocol';
import { BOMB, HOT } from './bomb.js';
import { playBox } from './field.js';
import { clientConfig, zoneOf } from './modes.js';
import { look, seasonColour } from './palette.js';
import { pillBox } from './pill.js';
import { fieldSeen, type Rect, type View } from './view.js';

export const MINIMAP_PX = 76; // its side, pixels
const INSET = 7; // between the panel's edge and the map's square
// The frame's inner line, drawn over a wider ink line: one of the two stands out on every grass
// and on the panel round it, in Light and Dark (palette.test.ts). Also the own dot's halo.
export const FRAME_LIGHT = '#ffffff';
const OWN_PX = 5; // the own dot's radius
// Its white halo, ink-outlined (review 2026-11-20: spring's green dot in spring's green zone on
// spring grass all but vanished, and the carriers' rings outshone it).
const HALO_PX = 2.5;
const CARRIER_PX = 3; // a carrier's bomb dot, and the hot ring round it
const RING_PX = 6;

// What the map is drawn from: the view on screen (the follow camera's, eased), the own character
// as drawn and the server's settings in force (development), for the walls at the start.
export interface MinimapInput {
  view: View;
  own: GhostState | undefined;
  tuning: Settings | null;
}

// Every mark of the map, in pixels.
export interface MinimapMarks {
  panel: Rect;
  edge: Rect; // the walls now: where the field ends
  frame: Rect | null; // what the screen shows, cut to the map; null when none of it is on it
  zone: { x: number; y: number; r: number } | null;
  carriers: { x: number; y: number }[];
  own: { x: number; y: number; team: number } | null;
}

// The marks of the map in a square of MINIMAP_PX whose top right corner is (right, top).
export function minimapMarks(
  at: { right: number; top: number },
  s: ServerState,
  { view, own, tuning }: MinimapInput,
): MinimapMarks {
  // The walls now: game-core's wall box, as the newest state has them (liveConfig).
  const walls = playBox(s);
  // The map's square: the walls at the match's start (the mode's config), round the same centre —
  // the walls close in on it and never past it.
  const half = Math.max(clientConfig(s.mode, tuning).wallHalf, walls.half);
  const square = {
    left: walls.x - half,
    top: walls.y - half,
    right: walls.x + half,
    bottom: walls.y + half,
  };
  const left = at.right - MINIMAP_PX;
  const k = (MINIMAP_PX - 2 * INSET) / (2 * half); // pixels per field unit, top-down (no tilt)
  const mx = (x: number): number => left + INSET + (x - square.left) * k;
  const my = (y: number): number => at.top + INSET + (y - square.top) * k;
  const onMap = (r: Rect): Rect => ({
    left: mx(r.left),
    top: my(r.top),
    right: mx(r.right),
    bottom: my(r.bottom),
  });
  const seen = cut(fieldSeen(view), square);
  const zone = zoneOf(s);
  return {
    panel: { left, top: at.top, right: at.right, bottom: at.top + MINIMAP_PX },
    edge: onMap({
      left: walls.x - walls.half,
      top: walls.y - walls.half,
      right: walls.x + walls.half,
      bottom: walls.y + walls.half,
    }),
    frame: seen && onMap(seen),
    zone: zone && { x: mx(zone.x), y: my(zone.y), r: Math.max(2, zone.r * k) },
    carriers: s.ghosts.filter((g) => g.flags & GHOST_BOMB).map((g) => ({ x: mx(g.x), y: my(g.y) })),
    own: own ? { x: mx(own.x), y: my(own.y), team: own.team } : null,
  };
}

// `r` cut to `to`; null when they do not overlap.
function cut(r: Rect, to: Rect): Rect | null {
  const c = {
    left: Math.max(r.left, to.left),
    top: Math.max(r.top, to.top),
    right: Math.min(r.right, to.right),
    bottom: Math.min(r.bottom, to.bottom),
  };
  return c.left < c.right && c.top < c.bottom ? c : null;
}

// Draws the map; returns its panel on screen.
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  at: { right: number; top: number },
  s: ServerState,
  input: MinimapInput,
): Rect {
  const m = minimapMarks(at, s, input);
  const l = look();
  const { panel, edge } = m;
  pillBox(ctx, { left: panel.left, top: panel.top, width: MINIMAP_PX, height: MINIMAP_PX }, 10);
  const w = edge.right - edge.left;
  const h = edge.bottom - edge.top;
  ctx.fillStyle = l.grass;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  ctx.fillRect(edge.left, edge.top, w, h);
  ctx.strokeRect(edge.left, edge.top, w, h);
  if (m.zone) dot(ctx, m.zone, seasonColour(s.season), 1.5);
  if (m.frame) frame(ctx, m.frame);
  for (const c of m.carriers) carrier(ctx, c);
  if (m.own) {
    dot(ctx, { ...m.own, r: OWN_PX + HALO_PX }, FRAME_LIGHT);
    dot(ctx, { ...m.own, r: OWN_PX }, seasonColour(m.own.team), 1.5);
  }
  return panel;
}

// The screen's frame: a light line on a wider ink line, so it reads on grass and panel alike.
function frame(ctx: CanvasRenderingContext2D, f: Rect): void {
  const args = [f.left, f.top, f.right - f.left, f.bottom - f.top] as const;
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(...args);
  ctx.strokeStyle = FRAME_LIGHT;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(...args);
}

// A carrier: the bomb's dark dot in a hot ring, both in ink (the ring on a wider ink line).
function carrier(ctx: CanvasRenderingContext2D, c: { x: number; y: number }): void {
  ctx.beginPath();
  ctx.arc(c.x, c.y, RING_PX, 0, Math.PI * 2);
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = HOT;
  ctx.lineWidth = 2;
  ctx.stroke();
  dot(ctx, { ...c, r: CARRIER_PX }, BOMB);
}

// A dot filled with `fill`, outlined in ink `line` pixels wide.
function dot(
  ctx: CanvasRenderingContext2D,
  d: { x: number; y: number; r: number },
  fill: string,
  line = 1,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
