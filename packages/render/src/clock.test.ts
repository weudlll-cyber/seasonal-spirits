// Seasonal Sumo — the clock's status line per mode: its name (sumo's with its variant), the
// halving countdown (the arena halves, the zone jumps, the bomb goes off), the last chance before
// the match end (the server's STATE_TO_END), the time played without a deadline
// (STATE_OPEN_END), and "match over".

import { describe, expect, it } from 'vitest';
import {
  STATE_LAST_STANDING,
  STATE_OPEN_END,
  STATE_RESULT,
  STATE_TO_END,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { fittedLine, lineFont, lineRoom, statusLine } from './clock.js';

const state = (over: Partial<ServerState>): ServerState => ({
  tick: 0,
  serverMs: 0,
  matchMs: 0,
  season: 0,
  seasonNumber: 0,
  seasonLeftMs: 40_000,
  countdownMs: null,
  flags: 0,
  nextMatchMs: 0,
  teamScore: [0, 0, 0, 0],
  mode: 0,
  livesAtStart: 3,
  wall: 0,
  area: { x: 1000, y: 1000, r: 900 },
  next: { x: 1000, y: 1000, r: 636.4 },
  ghosts: [],
  ...over,
});

describe('clock status line', () => {
  it("counts down to each mode's halving", () => {
    const countdown = { countdownMs: 7000, seasonLeftMs: 7000 };
    expect([0, 1, 2].map((mode) => statusLine(state({ ...countdown, mode })))).toEqual([
      'HALVING in 0:07 — the arena halves, then Summer is in season',
      'HALVING in 0:07 — the zone jumps to Summer and halves',
      'HALVING in 0:07 — the bomb goes off',
    ]);
  });

  it('names the mode, the season and the time left', () => {
    expect(statusLine(state({ mode: 1 }))).toBe(
      'King of the Season · Spring · 0:40 left · next: Summer',
    );
  });

  it('says LAST CHANCE when the countdown runs to the match end', () => {
    const last = { season: 3, seasonNumber: 3, flags: STATE_TO_END };
    expect(statusLine(state({ ...last, countdownMs: 4200, seasonLeftMs: 4200 }))).toBe(
      'LAST CHANCE — push them off · 0:05',
    );
    expect(statusLine(state(last))).toBe('Seasonal Sumo · Points · Winter · 0:40 to the end');
  });

  it("names sumo's variant, and without a deadline shows the time played", () => {
    const open = { season: 3, seasonNumber: 3, matchMs: 412_000 };
    const flags = STATE_LAST_STANDING | STATE_OPEN_END;
    expect(statusLine(state({ ...open, flags }))).toBe(
      'Seasonal Sumo · Last One Standing · Winter · 6:52 played',
    );
    expect(statusLine(state({ flags: STATE_LAST_STANDING }))).toBe(
      'Seasonal Sumo · Last One Standing · Spring · 0:40 left · next: Summer',
    );
  });

  it('says the match is over during the result', () => {
    expect(statusLine(state({ season: 3, seasonNumber: 3, flags: STATE_RESULT }))).toBe(
      'Seasonal Sumo · Points · match over',
    );
  });
});

describe('clock status line on a narrow screen (owner 2026-11-17: band text cut off)', () => {
  // A canvas whose text is 0.47 em wide per character: Fredoka's widest countdown line
  // (measured in Chromium 2026-11-19: 0.43–0.48 em).
  const fake = { font: '500 13px Fredoka, system-ui, sans-serif' };
  const px = (): number => Number(/([\d.]+)px/.exec(fake.font)?.[1]);
  const ctx = Object.assign(fake, {
    measureText: (t: string) => ({ width: t.length * 0.47 * px() }),
  }) as unknown as CanvasRenderingContext2D;
  // The clock's pill on a 390 px phone (the client's Light/Dark switch sits in the band).
  const room = lineRoom(390);

  it('shrinks the longest line of every mode until it fits a 390 px phone, not below 11 px', () => {
    for (const mode of [0, 1, 2]) {
      const line = statusLine(state({ mode, countdownMs: 6000 }));
      lineFont(ctx, line, room);
      expect(ctx.measureText(line).width, line).toBeLessThanOrEqual(room);
      expect(px(), line).toBeGreaterThanOrEqual(11);
    }
  });

  it('stops at 11 px even where the line would need less (NIGHT 2026-11-19: 9 px)', () => {
    expect(lineFont(ctx, 'x'.repeat(200), room)).toBe('500 11px Fredoka, system-ui, sans-serif');
  });

  it("drops the next season where a long mode's line would run under the viewer's switch", () => {
    const viewer = lineRoom(390, 64); // the viewer's SWITCH_ROOM on a 390 px phone
    const s = state({ flags: STATE_LAST_STANDING });
    const line = fittedLine(ctx, s, viewer);
    expect(line).toBe('Seasonal Sumo · Last One Standing · Spring · 0:40 left');
    expect(ctx.measureText(line).width).toBeLessThanOrEqual(viewer);
    expect(fittedLine(ctx, s, 1894)).toBe(statusLine(s)); // room enough: the whole line
  });

  // Day chain 2026-11-22, final piece: "HALVING in 0:08 — the arena halves, then Summer is in
  // season" ran under the viewer's switch on a 390 px phone.
  it("keeps a countdown to its words and time where it would run under the viewer's switch", () => {
    const viewer = lineRoom(390, 64);
    const halving = state({ countdownMs: 8000 });
    expect(fittedLine(ctx, halving, viewer)).toBe('HALVING in 0:08');
    // A countdown that fits stays whole.
    const last = state({ countdownMs: 9000, flags: STATE_TO_END });
    expect(fittedLine(ctx, last, viewer)).toBe('LAST CHANCE — push them off · 0:09');
    expect(statusLine(last, false)).toBe('LAST CHANCE · 0:09'); // its short form
    expect(fittedLine(ctx, halving, 1894)).toBe(statusLine(halving)); // room enough: whole
  });

  it('keeps 13 px where the line fits', () => {
    expect(lineFont(ctx, 'Seasonal Sumo · Spring · 1:15 left', 1894)).toBe(
      '500 13px Fredoka, system-ui, sans-serif',
    );
  });
});
