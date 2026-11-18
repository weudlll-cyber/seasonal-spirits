// Seasonal Sumo — the season clock at the top: four seasons of the match in order (a window
// that moves on when a mode has more, as bomb's nine or sumo's keep-halving), the current one
// highlighted, the mode's name (sumo's with its variant), the next season, the time left, and in
// the last seconds before a deadline its countdown — the mode's halving, or the match end
// ("LAST CHANCE"); with no deadline at all the time played. Which deadline is next the server
// says (STATE_TO_END, STATE_OPEN_END). A white rounded box at the top left (Sky Island look,
// 2026-11-18). The team scores sit in the band below (scores.ts).

import {
  STATE_OPEN_END,
  STATE_RESULT,
  STATE_TO_END,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { matchName, modeWords, seasonsOf } from './modes.js';
import { look, seasonColour, seasonName } from './palette.js';
import { pillBox, roundBox } from './pill.js';

const CELLS = 4;
const MARGIN = 6; // pixels between the clock's box and the screen's edges
const PAD = 8; // pixels between the box's edge and what it holds
const MAX_CELL = 110;
const LINE_PX = 13; // the status line's font size, as long as it fits
const MIN_LINE_PX = 9;

export const CLOCK_HEIGHT = 64;
// Pixels kept free at the top right for the Light/Dark switch (look-switch.ts, index.html #look).
const SWITCH_ROOM = 64;

// The clock box's width on a canvas `width` px wide: its cells at most MAX_CELL each, clear of
// the switch.
export function clockWidth(width: number): number {
  return Math.min(width - 2 * MARGIN - SWITCH_ROOM, CELLS * MAX_CELL + 2 * PAD);
}

export function mmss(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function drawClock(ctx: CanvasRenderingContext2D, s: ServerState | undefined): void {
  const l = look();
  const width = clockWidth(ctx.canvas.width);
  pillBox(ctx, { left: MARGIN, top: MARGIN, width, height: CLOCK_HEIGHT - 2 * MARGIN }, 12);
  if (!s) return;
  // The window: the season before the current one first, as long as the match has more (keep-
  // halving goes on past the mode's count).
  const seasons = Math.max(seasonsOf(s.mode), s.seasonNumber + 1);
  const first = Math.max(0, Math.min(s.seasonNumber - 1, seasons - CELLS));
  const cell = (width - 2 * PAD) / CELLS;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = l.ink;
  for (let i = 0; i < CELLS; i++) {
    const k = first + i; // the season number within the match
    const season = (((s.season + k - s.seasonNumber) % 4) + 4) % 4;
    const x = MARGIN + PAD + i * cell;
    const current = k === s.seasonNumber;
    // A past season only outlined in its colour, the others filled with it; the text never
    // faded, so it reads in both looks.
    const past = k < s.seasonNumber;
    roundBox(ctx, { left: x, top: 12, width: cell - 6, height: current ? 22 : 16 }, 6);
    ctx.fillStyle = past ? l.panel : seasonColour(season);
    ctx.fill();
    ctx.strokeStyle = past ? seasonColour(season) : l.ink;
    ctx.stroke();
    ctx.fillStyle = past ? l.panelText : l.ink;
    ctx.font = `${current ? '600' : '500'} 12px Fredoka, system-ui, sans-serif`;
    ctx.fillText(seasonName(season), x + 6, current ? 23 : 20);
  }
  const line = statusLine(s);
  ctx.font = lineFont(ctx, line, width - 2 * PAD);
  ctx.fillStyle = s.countdownMs === null ? l.panelText : l.alertText;
  ctx.fillText(line, MARGIN + PAD, 46);
  ctx.textBaseline = 'alphabetic';
}

// The status line's font: 13 px, smaller until the whole line fits `room` pixels (FIX
// 2026-11-17-2: the band text never cut off — "HALVING in 0:06 — the arena halves, then
// Summer is in season" ran past a 390 px phone's edge). Leaves the font set on `ctx`.
export function lineFont(ctx: CanvasRenderingContext2D, line: string, room: number): string {
  let px = LINE_PX;
  const font = (): string => `500 ${String(px)}px Fredoka, system-ui, sans-serif`;
  ctx.font = font();
  while (px > MIN_LINE_PX && ctx.measureText(line).width > room) {
    px -= 0.5;
    ctx.font = font();
  }
  return font();
}

export function statusLine(s: ServerState): string {
  const words = modeWords(s.mode);
  const next = seasonName(s.season + 1);
  const toEnd = (s.flags & STATE_TO_END) !== 0;
  const name = matchName(s);
  if (s.flags & STATE_RESULT) return `${name} · match over`;
  if (s.flags & STATE_OPEN_END)
    return `${name} · ${seasonName(s.season)} · ${mmss(s.matchMs)} played`;
  if (s.countdownMs !== null) {
    return toEnd
      ? `LAST CHANCE — ${words.lastChance} · ${mmss(s.countdownMs)}`
      : `HALVING in ${mmss(s.countdownMs)} — ${words.countdown(next)}`;
  }
  const now = `${name} · ${seasonName(s.season)} · ${mmss(s.seasonLeftMs)}`;
  return toEnd ? `${now} to the end` : `${now} left · next: ${next}`;
}
