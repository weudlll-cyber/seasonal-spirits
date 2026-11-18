// Seasonal Sumo — the season clock at the top: one line in a small white pill at the top left —
// the mode's name (sumo's with its variant), the season in play with a dot in its colour, the
// time left and the next season, and in the last seconds before a deadline its countdown — the
// mode's halving, or the match end ("LAST CHANCE"); with no deadline at all the time played.
// Which deadline is next the server says (STATE_TO_END, STATE_OPEN_END). The row of season
// cells it had is gone (NIGHT 2026-11-19: it repeated the team pills in the band below,
// scores.ts).

import {
  STATE_OPEN_END,
  STATE_RESULT,
  STATE_TO_END,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { matchName, modeWords } from './modes.js';
import { look, seasonColour, seasonName } from './palette.js';
import { pillBox } from './pill.js';

const MARGIN = 5; // pixels between the pill and the screen's edges
const PAD = 8; // pixels between the pill's edge and its text
const DOT = 10; // the season dot's diameter, and the gap after it
const LINE_PX = 13; // the line's font size, as long as it fits
const MIN_LINE_PX = 11; // the smallest it shrinks to on a phone (NIGHT 2026-11-19: 9 px was too small)

export const CLOCK_HEIGHT = 36;

// The pixels the line has inside the pill on a canvas `width` px wide, `reserve` px kept free at
// the right (the viewer's Light/Dark switch).
export function lineRoom(width: number, reserve = 0): number {
  return width - 2 * MARGIN - reserve - 2 * PAD - 2 * DOT;
}

export function mmss(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function drawClock(
  ctx: CanvasRenderingContext2D,
  s: ServerState | undefined,
  reserve = 0,
): void {
  if (!s) return;
  const l = look();
  const line = statusLine(s);
  ctx.font = lineFont(ctx, line, lineRoom(ctx.canvas.width, reserve));
  const width = ctx.measureText(line).width + 2 * PAD + 2 * DOT;
  const height = CLOCK_HEIGHT - 2 * MARGIN;
  const middle = MARGIN + height / 2;
  pillBox(ctx, { left: MARGIN, top: MARGIN, width, height });
  ctx.beginPath();
  ctx.arc(MARGIN + PAD + DOT / 2, middle, DOT / 2, 0, 2 * Math.PI);
  ctx.fillStyle = seasonColour(s.season);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = l.ink;
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = s.countdownMs === null ? l.panelText : l.alertText;
  ctx.fillText(line, MARGIN + PAD + 2 * DOT, middle + 1);
  ctx.textBaseline = 'alphabetic';
}

// The line's font: 13 px, smaller down to 11 px until the whole line fits `room` pixels (FIX
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
