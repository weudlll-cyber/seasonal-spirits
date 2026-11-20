// Seasonal Sumo — the field of each mode as a floating island (Sky Island look, 2026-11-18):
// sumo's arena is the island's round top with the next halving's line as a dashed crack (pulsing
// in the countdown) and its outer ring breaking off at a halving (breakoff.ts); hill and bomb a
// rounded platform with a fence along the walls (fence.ts), in hill the zone in the season's
// colour and, in the countdown, its next place dashed (the server sends both discs, protocol
// state.ts; zone.ts draws it). This is the ground layer (owner 2026-11-19: the crack lay over the
// trees, the fence over the characters): the top, what lies flat on it — tufts, flowers, the
// season's leaves and snow —, the crack and its ticks, the zone's glow and ring and its next
// place, all under every tree, post, flag and character; those stand in one depth order
// (standing.ts, ghosts.ts). The season in play tints it and decorates it (season.ts,
// season-decor.ts), its trees never inside King's zones. The sky around it is sky.ts.

import { DEFAULT_CONFIG, walled } from '@seasonal-spirits/game-core';
import {
  GHOST_FALLING,
  GHOST_OUT,
  STATE_OPEN_END,
  STATE_RESULT,
  STATE_TO_END,
  type ServerState,
  type WireDisc,
} from '@seasonal-spirits/protocol';
import type { BreakOff } from './breakoff.js';
import { drawGroundDecor } from './decor.js';
import { POST_RISE } from './fence.js';
import { drawGround, type OnScreen } from './island.js';
import { clientConfig, liveConfig, zoneOf } from './modes.js';
import { look, seasonColour } from './palette.js';
import { followSeason, type Seasons } from './season.js';
import { drawSeasonGround } from './season-decor.js';
import { shape } from './shape.js';
import { drawFrontClouds } from './sky.js';
import { VIEW_TILT, fitBox, groundCircle, sx, sy, type Box, type Room, type View } from './view.js';
import { FLAG_RISE, drawNextZone, drawZone, zoneKeepOut } from './zone.js';

const CENTRE = DEFAULT_CONFIG.fieldSize / 2;
// Before the first state: sumo's arena as it starts.
const START: WireDisc = { x: CENTRE, y: CENTRE, r: DEFAULT_CONFIG.arenaRadius };
const PLATFORM = 1.05; // the platform reaches a little past the walls: the fence stands on it
const CRACK_TICKS = 18;
// The zoom cap (planner 2026-11-19): a character's body diameter on screen at most this share
// of the screen's shorter side — 48 px at 1280×800 — on screens whose shorter side is at least
// CAP_FROM_PX (desktop, tablet). A phone has no cap (decision 2026-11-19, BACKLOG am: late
// Sumo's island was 210 of 390 px wide): there the camera always fits the field. The cap holds
// only while more than FEW_STANDING characters stand; with fewer the camera comes closer until the
// island fills CLOSE_FILL of the room fitBox fits it into (planner 2026-11-20: late Sumo's island
// was a third of a desktop's width).
export const BODY_SHARE = 0.06;
export const CAP_FROM_PX = 600;
export const FEW_STANDING = 8;
export const CLOSE_FILL = 2 / 3;

// The playing area, the square the client's camera fits (owner 2026-11-17: the whole of it
// always on screen): the walled square as it is now, or sumo's arena as it is now — the server
// eases the walls and the edge in after a halving, so the camera follows them in.
export function playBox(s: ServerState | undefined): Box {
  const cfg = s ? liveConfig(s) : clientConfig(0);
  if (walled(cfg)) return { x: CENTRE, y: CENTRE, half: cfg.wallHalf };
  const a = s?.area ?? START;
  return { x: a.x, y: a.y, half: a.r };
}

// Sumo's island top as it is now (where characters fall off it, fall.ts), null in the walled
// modes.
export function islandOf(s: ServerState | undefined): WireDisc | null {
  return walled(clientConfig(s?.mode ?? 0)) ? null : (s?.area ?? START);
}

// The square the client's camera fits around the playing area: room for a character standing on
// its edge and, in the walled modes, for the back fence's posts above the back wall (NIGHT
// 2026-11-19: they reached under the band) and in hill for the zone's flag poles there — their
// height in field depth at the usual slant, the most a steeper view needs. On a screen of
// CAP_FROM_PX and more never so small that a body is drawn larger than BODY_SHARE allows
// (2026-11-19: late in a match the characters grew huge), so a late halving there shows more sky
// round the island instead — while more than FEW_STANDING stand; with fewer the camera comes
// closer, never past the playing area at CLOSE_FILL of the room and never past the fit a phone
// gets.
export function cameraBox(s: ServerState | undefined, screen: Screen): Box {
  const play = playBox(s);
  const box = around(play, rise(s));
  const { width, height } = screen.ctx.canvas;
  const shorter = Math.min(width, height);
  if (shorter < CAP_FROM_PX) return box;
  const maxScale = (BODY_SHARE * shorter) / (2 * shape().ghostRadius);
  const capped = halfPx(screen) / maxScale;
  const far = standing(s) > FEW_STANDING ? capped : Math.min(capped, play.half / CLOSE_FILL);
  return { ...box, half: Math.max(box.half, far) };
}

// How many characters stand in the playing area: neither falling nor out.
const standing = (s: ServerState | undefined): number =>
  s?.ghosts.filter((g) => !(g.flags & (GHOST_FALLING | GHOST_OUT))).length ?? 0;

// The pixels `screen` gives half of any box the camera fits: fitBox's scale for a half side of 1.
export function halfPx(screen: Screen): number {
  return fitBox(screen.ctx, screen.top, { x: 0, y: 0, half: 1 }, screen.room).scale;
}

// What the camera is fitted into: the canvas, the pixels above the field and the room it keeps
// clear (view.ts fitBox).
export interface Screen {
  ctx: CanvasRenderingContext2D;
  top: number;
  room?: Room;
}

// How high, in body radii, what stands on the back wall reaches: the fence's posts, King's flags;
// nothing in sumo.
function rise(s: ServerState | undefined): number {
  if (!walled(clientConfig(s?.mode ?? 0))) return 0;
  return zoneOf(s) ? FLAG_RISE : POST_RISE;
}

// The camera's square around a playing area `b` (cameraBox), `up` body radii above its back edge.
function around(b: Box, up: number): Box {
  const ghost = shape().ghostRadius;
  const extra = Math.max(0, (up * ghost) / VIEW_TILT - ghost);
  return { x: b.x, y: b.y - extra / 2, half: b.half + ghost + extra / 2 };
}

// What the field remembers between frames: sumo's halving and the season's fade.
export interface FieldMemory {
  breaks: BreakOff;
  seasons: Seasons;
}

// The ground layer under everything that stands; returns the ground on screen, where the island's
// standing pieces stand (standing.ts). `memory.behind`: what drops behind the island — the
// characters off its back (ghosts.ts drawFallsBehind) —, drawn after the breaking ring's back and
// before the island's body, which hides it.
export function drawField(
  v: View,
  s: ServerState | undefined,
  nowMs: number,
  memory: FieldMemory & { behind?: () => void },
): OnScreen {
  const { box, walls } = drawBehind(v, s, nowMs, memory);
  const r = walls ? box.half * PLATFORM : box.half;
  const ground = {
    ...drawGround(v, { x: box.x, y: box.y, r, square: walls }),
    keepOut: zoneKeepOut(v, box, s),
  };
  drawGroundDecor(v.ctx, ground, nowMs);
  drawSeasonGround(v.ctx, ground, memory.seasons, nowMs);
  if (walls) drawWalled(v, s, nowMs);
  else if (s?.next && ahead(s)) drawCrack(v, s.next, s.countdownMs === null ? null : nowMs);
  memory.breaks.draw(v, nowMs, 'front');
  drawFrontClouds(v.ctx);
  return ground;
}

// What lies behind the island: the season followed, the halving's breaking ring's back pieces and
// `behind`; returns the playing area and whether it is walled.
function drawBehind(
  v: View,
  s: ServerState | undefined,
  nowMs: number,
  { breaks, seasons, behind }: FieldMemory & { behind?: () => void },
): { box: Box; walls: boolean } {
  followSeason(seasons, s, nowMs);
  const walls = walled(clientConfig(s?.mode ?? 0));
  breaks.observe(walls ? null : (s?.area ?? START), nowMs, shape().sumo.shrink);
  breaks.draw(v, nowMs, 'behind');
  behind?.();
  return { box: playBox(s), walls };
}

// A halving still comes (not the match end, not an open end, not the result pause).
const ahead = (s: ServerState): boolean =>
  !(s.flags & (STATE_TO_END | STATE_OPEN_END | STATE_RESULT));

// Hill on the ground: the zone's glow and ring and, in the countdown before a halving, its next
// place dashed.
function drawWalled(v: View, s: ServerState | undefined, nowMs: number): void {
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
