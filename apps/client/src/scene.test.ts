// Seasonal Sumo — the client's one camera (owner 2026-11-17: only half the arena showed): the
// whole playing area on screen at desktop and phone sizes, before and after every halving, below
// the band and clear of the Dash button and the joystick.

import { DEFAULT_CONFIG, GAME_MODES, type GameMode } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { ZOOM_CAP, overlaps, type Rect } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';
import { stickZone } from './hud.js';
import { camera, fieldTop, playArea } from './scene.js';

const C = DEFAULT_CONFIG.fieldSize / 2;
const HALVED = DEFAULT_CONFIG.sumo.shrink; // a halving's radius factor (the setting)
const DASH = 96; // index.html #dash, 16 px from the bottom right corner
const SCREENS = [
  { width: 1918, height: 945, touch: false },
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
];

function zonesOf(width: number, height: number, touch: boolean): Rect[] {
  const dash = {
    left: width - 16 - DASH,
    top: height - 16 - DASH,
    right: width - 16,
    bottom: height - 16,
  };
  return touch ? [dash, stickZone(width, height)] : [dash];
}

function stateOf(mode: GameMode, r: number): ServerState {
  return { mode: GAME_MODES.indexOf(mode), area: { x: C, y: C, r } } as unknown as ServerState;
}

// Sumo's arena from the start through three halvings, halfway through an easing too; the walled
// square of hill and bomb (their zone inside it changes, the square does not).
const STATES: [string, ServerState][] = [
  ...[0, 0.5, 1, 1.5, 2, 2.5, 3].map((k): [string, ServerState] => [
    `sumo after ${String(k)} halvings`,
    stateOf('sumo', DEFAULT_CONFIG.arenaRadius * HALVED ** k),
  ]),
  ['hill', stateOf('hill', 300)],
  ['bomb', stateOf('bomb', 0)],
];

describe("King's hint row", () => {
  it('starts the field below the hint pill in King only, so the pill never covers the back fence', () => {
    const ctx = { canvas: { width: 1280, height: 800 } } as CanvasRenderingContext2D;
    const hill = stateOf('hill', 300);
    expect(fieldTop(hill)).toBeGreaterThan(fieldTop(stateOf('sumo', 900)));
    expect(fieldTop(stateOf('bomb', 0))).toBe(fieldTop(stateOf('sumo', 900)));
    expect(camera(ctx, hill, []).top).toBe(fieldTop(hill));
  });
});

describe('one camera for every mode', () => {
  for (const { width, height, touch } of SCREENS) {
    const ctx = { canvas: { width, height } } as CanvasRenderingContext2D;
    const zones = zonesOf(width, height, touch);
    it(`fits the whole playing area below the band, clear of the controls at ${String(width)}×${String(height)}`, () => {
      for (const [what, s] of STATES) {
        const view = camera(ctx, s, zones);
        const a = playArea(view, s);
        expect(a.top, what).toBeGreaterThanOrEqual(view.top);
        expect(a.left, what).toBeGreaterThanOrEqual(0);
        expect(a.right, what).toBeLessThanOrEqual(width);
        expect(a.bottom, what).toBeLessThanOrEqual(height);
        for (const z of zones) expect(overlaps(a, z), `${what} under a control`).toBe(false);
        // Large enough to play — but late in Sumo the zoom cap keeps the characters' size and the
        // smaller arena shrinks on screen with it (owner 2026-11-19: cap 1.5).
        if (!what.startsWith('sumo after 3'))
          expect(a.right - a.left, `${what} large enough to play`).toBeGreaterThan(200);
      }
    });

    it(`keeps the shrunken arena as large on screen as the first, up to 1.5 times the start's scale, at ${String(width)}×${String(height)}`, () => {
      const sizes = STATES.slice(0, 7).map(([, s]) => {
        const a = playArea(camera(ctx, s, zones), s);
        return a.right - a.left;
      });
      const first = sizes[0] ?? 0;
      // Through the first halving nearly as large: only the room kept for a ghost on the edge (a
      // ghost radius) is a larger share of the smaller arena. After that the zoom cap (render
      // ZOOM_CAP, 1.5 since owner 2026-11-19) holds the scale: the arena shrinks on screen.
      for (const px of sizes.slice(0, 3)) expect(px).toBeGreaterThan(first * 0.9);
      STATES.slice(0, 7).forEach(([, s], k) => {
        const r = s.area?.r ?? 0;
        expect(sizes[k] ?? 0).toBeLessThanOrEqual(
          (first * ZOOM_CAP * r) / DEFAULT_CONFIG.arenaRadius + 1,
        );
      });
    });
  }
});
