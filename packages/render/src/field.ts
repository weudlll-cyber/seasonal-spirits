// Seasonal Sumo — the field of each mode as a floating island (Sky Island look, 2026-11-18):
// sumo's arena is the island's round top with the next halving's line as a dashed crack (pulsing
// in the countdown) and its outer ring breaking off at a halving (breakoff.ts); hill and bomb a
// rounded platform with a fence along the walls, in hill the zone ringed with bunting in the
// season's colour and, in the countdown, its next place dashed (the server sends both discs,
// protocol state.ts; zone.ts draws it). The back fence and the zone's glow lie under the
// characters; the zone's ring, flags and crown and the side and near fences stand over them,
// and nothing of a character shows beyond those fences (fieldFront, 2026-11-19). The season in
// play tints it and decorates it (season.ts, season-decor.ts), its trees never inside King's
// zones. The sky around it is sky.ts.

import { DEFAULT_CONFIG, walled } from '@seasonal-spirits/game-core';
import {
  STATE_OPEN_END,
  STATE_RESULT,
  STATE_TO_END,
  type ServerState,
  type WireDisc,
} from '@seasonal-spirits/protocol';
import type { BreakOff } from './breakoff.js';
import { drawDecor } from './decor.js';
import {
  BACK_FENCE,
  FENCE_RISE,
  NEAR_FENCE,
  drawFence,
  drawGround,
  type OnScreen,
} from './island.js';
import { clientConfig, liveConfig, zoneOf } from './modes.js';
import { look, seasonColour } from './palette.js';
import { followSeason, type Seasons } from './season.js';
import { drawSeasonOn } from './season-decor.js';
import { shape } from './shape.js';
import { drawFrontClouds } from './sky.js';
import {
  VIEW_TILT,
  fitBox,
  groundCircle,
  sx,
  sy,
  type Box,
  type Rect,
  type Room,
  type View,
} from './view.js';
import { drawNextZone, drawZone, drawZoneMarks, zoneKeepOut } from './zone.js';

const CENTRE = DEFAULT_CONFIG.fieldSize / 2;
// Before the first state: sumo's arena as it starts.
const START: WireDisc = { x: CENTRE, y: CENTRE, r: DEFAULT_CONFIG.arenaRadius };
const PLATFORM = 1.05; // the platform reaches a little past the walls: the fence stands on it
const CRACK_TICKS = 18;
// The zoom cap (planner 2026-11-19): a character's body diameter on screen at most this share
// of the screen's shorter side — 48 px at 1280×800, 23.4 px at 390×844. It replaced a cap of 1.5
// times the match start's scale, which on a phone kept late King's small field a small square
// with sky above and below.
export const BODY_SHARE = 0.06;

// The playing area, the square the client's camera fits (owner 2026-11-17: the whole of it
// always on screen): the walled square as it is now, or sumo's arena as it is now — the server
// eases the walls and the edge in after a halving, so the camera follows them in.
export function playBox(s: ServerState | undefined): Box {
  const cfg = s ? liveConfig(s) : clientConfig(0);
  if (walled(cfg)) return { x: CENTRE, y: CENTRE, half: cfg.wallHalf };
  const a = s?.area ?? START;
  return { x: a.x, y: a.y, half: a.r };
}

// The square the client's camera fits around the playing area: room for a character standing on
// its edge and, in the walled modes, for the back fence's posts above the back wall (NIGHT
// 2026-11-19: they reached under the band) — their height in field depth at the usual slant, the
// most a steeper view needs. Never so small on `screen` that a body is drawn larger than
// BODY_SHARE allows (2026-11-19: late in a match the characters grew huge), so a late halving
// shows more sky round the island instead.
export function cameraBox(s: ServerState | undefined, screen: Screen): Box {
  const box = around(playBox(s), walled(clientConfig(s?.mode ?? 0)));
  // The pixels the screen gives half of any box: fitBox's scale for a half side of 1.
  const perHalf = fitBox(screen.ctx, screen.top, { x: 0, y: 0, half: 1 }, screen.room).scale;
  const { width, height } = screen.ctx.canvas;
  const maxScale = (BODY_SHARE * Math.min(width, height)) / (2 * shape().ghostRadius);
  return { ...box, half: Math.max(box.half, perHalf / maxScale) };
}

// What the camera is fitted into: the canvas, the pixels above the field and the room it keeps
// clear (view.ts fitBox).
export interface Screen {
  ctx: CanvasRenderingContext2D;
  top: number;
  room?: Room;
}

// The camera's square around a playing area `b` (cameraBox).
function around(b: Box, walls: boolean): Box {
  const ghost = shape().ghostRadius;
  const extra = walls ? Math.max(0, (FENCE_RISE * b.half) / VIEW_TILT - ghost) : 0;
  return { x: b.x, y: b.y - extra / 2, half: b.half + ghost + extra / 2 };
}

// What the field remembers between frames: sumo's halving and the season's fade.
export interface FieldMemory {
  breaks: BreakOff;
  seasons: Seasons;
}

// The island under the ghosts; returns the ground on screen, for what stands in front of a
// character (decor-front.ts).
export function drawField(
  v: View,
  s: ServerState | undefined,
  nowMs: number,
  { breaks, seasons }: FieldMemory,
): OnScreen {
  followSeason(seasons, s, nowMs);
  const box = playBox(s);
  const walls = walled(clientConfig(s?.mode ?? 0));
  breaks.observe(walls ? null : (s?.area ?? START), nowMs, shape().sumo.shrink);
  breaks.draw(v, nowMs, 'behind');
  const r = walls ? box.half * PLATFORM : box.half;
  const ground = {
    ...drawGround(v, { x: box.x, y: box.y, r, square: walls }),
    keepOut: zoneKeepOut(v, box, s),
  };
  drawDecor(v.ctx, ground, nowMs);
  drawSeasonOn(v.ctx, ground, seasons, nowMs);
  if (walls) drawWalled(v, s, { box, nowMs });
  else if (s?.next && ahead(s)) drawCrack(v, s.next, s.countdownMs === null ? null : nowMs);
  breaks.draw(v, nowMs, 'front');
  drawFrontClouds(v.ctx);
  return ground;
}

// What of the field stands in front of the characters (ghosts.ts GhostStyle.front).
export interface FieldFront {
  clip: Rect; // the bodies are cut to it: nothing of a character beyond the side or near fence
  draw: () => void; // over the bodies, under their labels
}

// Hill and bomb (owner 2026-11-19: characters stood over the fences, a full zone hid its
// outline): over the bodies King's zone's ring, flags and crown, then the side and near fences —
// every character inside the walls stands behind the near one —, the bodies cut at the side
// and near walls; null in sumo.
export function fieldFront(v: View, s: ServerState | undefined): FieldFront | null {
  if (!walled(clientConfig(s?.mode ?? 0))) return null;
  const box = playBox(s);
  const zone = zoneOf(s);
  return {
    clip: {
      left: sx(v, box.x - box.half),
      top: 0,
      right: sx(v, box.x + box.half),
      bottom: sy(v, box.y + box.half),
    },
    draw: () => {
      if (zone && s) drawZoneMarks(v, zone, seasonColour(s.season));
      drawFence(v, box, box.half, NEAR_FENCE);
    },
  };
}

// A halving still comes (not the match end, not an open end, not the result pause).
const ahead = (s: ServerState): boolean =>
  !(s.flags & (STATE_TO_END | STATE_OPEN_END | STATE_RESULT));

// Hill and bomb, under the characters: the back fence; in hill the zone's glow and, in the
// countdown before a halving, its next place dashed.
function drawWalled(
  v: View,
  s: ServerState | undefined,
  { box, nowMs }: { box: Box; nowMs: number },
): void {
  drawFence(v, box, box.half, BACK_FENCE);
  if (!s?.area) return;
  drawZone(v, s.area, seasonColour(s.season), nowMs);
  if (s.next && s.countdownMs !== null && ahead(s))
    drawNextZone(v, s.next, seasonColour(s.season + 1));
}

// Where the next halving breaks the island: a dashed crack with small ticks across it; in the
// countdown (`pulseMs` the time) it pulses; at night it glows.
function drawCrack(v: View, next: WireDisc, pulseMs: number | null): void {
  const { ctx } = v;
  const beat = pulseMs === null ? 0 : 0.5 + 0.5 * Math.sin(pulseMs / 120);
  const l = look();
  ctx.globalAlpha = pulseMs === null ? 0.85 : 0.6 + 0.4 * beat;
  ctx.strokeStyle = l.crack;
  // At night the crack glows.
  ctx.shadowColor = l.crack;
  ctx.shadowBlur = l.night ? 10 + 6 * beat : 0;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 + 2 * beat;
  groundCircle(v, next.x, next.y, next.r);
  ctx.setLineDash([16, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < CRACK_TICKS; i++) {
    const a = ((i + 0.3) / CRACK_TICKS) * Math.PI * 2;
    const x = sx(v, next.x + Math.cos(a) * next.r);
    const y = sy(v, next.y + Math.sin(a) * next.r);
    const lean = i % 2 ? 5 : -5;
    ctx.moveTo(x - lean, y - 5);
    ctx.lineTo(x + lean * 0.4, y + 2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
