// Seasonal Sumo — the field of each mode as a floating island (Sky Island look, 2026-11-18):
// sumo's arena is the island's round top with the next halving's line as a dashed crack (pulsing
// in the countdown) and its outer ring breaking off at a halving (breakoff.ts); hill and bomb a
// rounded platform with a fence along the walls, in hill the zone ringed with bunting in the
// season's colour and, in the countdown, its next place dashed (the server sends both discs,
// protocol state.ts). The sky around it is sky.ts.

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
import { drawFence, drawGround } from './island.js';
import { clientConfig } from './modes.js';
import { look, seasonColour } from './palette.js';
import { shape } from './shape.js';
import { drawFrontClouds } from './sky.js';
import { groundCircle, sx, sy, type Box, type View } from './view.js';

const CENTRE = DEFAULT_CONFIG.fieldSize / 2;
// Before the first state: sumo's arena as it starts.
const START: WireDisc = { x: CENTRE, y: CENTRE, r: DEFAULT_CONFIG.arenaRadius };
const PLATFORM = 1.05; // the platform reaches a little past the walls: the fence stands on it
const CRACK_TICKS = 18;

// The playing area, the square the client's camera fits (owner 2026-11-17: the whole of it
// always on screen): the walled square, or sumo's arena as it is now — the server eases its edge
// in after a halving, so the camera follows it in.
export function playBox(s: ServerState | undefined): Box {
  const cfg = clientConfig(s?.mode ?? 0);
  if (walled(cfg)) return { x: CENTRE, y: CENTRE, half: cfg.wallHalf };
  const a = s?.area ?? START;
  return { x: a.x, y: a.y, half: a.r };
}

// The island under the ghosts; `breaks` remembers sumo's halving between frames.
export function drawField(
  v: View,
  s: ServerState | undefined,
  nowMs: number,
  breaks: BreakOff,
): void {
  const box = playBox(s);
  const walls = walled(clientConfig(s?.mode ?? 0));
  breaks.observe(walls ? null : (s?.area ?? START), nowMs, shape().sumo.shrink);
  breaks.draw(v, nowMs, 'behind');
  const r = walls ? box.half * PLATFORM : box.half;
  drawDecor(v.ctx, drawGround(v, { x: box.x, y: box.y, r, square: walls }));
  if (walls) drawWalled(v, s, box);
  else if (s?.next && ahead(s)) drawCrack(v, s.next, s.countdownMs === null ? null : nowMs);
  breaks.draw(v, nowMs, 'front');
  drawFrontClouds(v.ctx);
}

// A halving still comes (not the match end, not an open end, not the result pause).
const ahead = (s: ServerState): boolean =>
  !(s.flags & (STATE_TO_END | STATE_OPEN_END | STATE_RESULT));

// Hill and bomb: the fence; in hill the zone and, in the countdown before a halving, its next
// place dashed.
function drawWalled(v: View, s: ServerState | undefined, box: Box): void {
  drawFence(v, box, box.half);
  if (!s?.area) return;
  drawZone(v, s.area, seasonColour(s.season));
  if (!s.next || s.countdownMs === null || !ahead(s)) return;
  groundCircle(v, s.next.x, s.next.y, s.next.r);
  v.ctx.setLineDash([12, 9]);
  v.ctx.strokeStyle = seasonColour(s.season + 1);
  v.ctx.lineWidth = 3;
  v.ctx.stroke();
  v.ctx.setLineDash([]);
}

// King of the Season's zone: tinted grass ringed by a string of small flags in its colour.
function drawZone(v: View, z: WireDisc, colour: string): void {
  const { ctx } = v;
  const ink = look().ink;
  groundCircle(v, z.x, z.y, z.r);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const flags = Math.max(8, Math.min(40, Math.round((z.r * v.scale) / 9)));
  ctx.fillStyle = colour;
  for (let i = 0; i < flags; i++) {
    const a = (i / flags) * Math.PI * 2;
    const x = sx(v, z.x + Math.cos(a) * z.r);
    const y = sy(v, z.y + Math.sin(a) * z.r);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 1);
    ctx.lineTo(x + 4, y - 1);
    ctx.lineTo(x, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
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
