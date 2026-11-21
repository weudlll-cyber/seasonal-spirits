// Seasonal Sumo — the Sky Island look's text reads in both looks (owner 2026-11-18: contrast at
// least 4.5:1): the panels' text and the clock's countdown on the panel. (The season names on
// their colours went with the clock's season cells, NIGHT 2026-11-19.) And the ink outlines stand
// out on every season's ground at 3:1 at least: the minimap's marks (2026-11-19, minimap.ts) and
// the own ring's outer edge (owner 2026-11-20, own.ts). The minimap's frame of the screen reads on
// every ground and on the panel round the walls, and a carrier's bomb dot on its hot ring (owner
// 2026-11-20). Every team's figure keeps its ink outline at 3:1 where its body does not stand out
// from the grass (Spring the closest, measured 2026-11-21).

import { describe, expect, it } from 'vitest';
import { BOMB, HOT } from './bomb.js';
import { FRAME_LIGHT } from './minimap.js';
import { inkWidth } from './character.js';
import { DARK, LIGHT, SEASON_COLOURS, SEASON_NAMES, type Look } from './palette.js';
import { TINTS } from './season.js';

// WCAG 2 relative luminance and contrast ratio of two #rrggbb colours.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe.each([
  ['Light', LIGHT],
  ['Dark', DARK],
] as [string, Look][])('text contrast in %s', (_, l) => {
  it("keeps the panels' text and the countdown at 4.5:1 or more", () => {
    expect(contrast(l.panelText, l.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(l.alertText, l.panel)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('ink on the season grounds', () => {
  it.each(SEASON_NAMES.map((name, i) => [name, i] as const))(
    "outlines the minimap's marks and the own ring at 3:1 or more on %s's ground, in Light and Dark",
    (_, i) => {
      const [light, dark] = TINTS[i] ?? [];
      expect(contrast(LIGHT.ink, light?.grass ?? LIGHT.ink)).toBeGreaterThanOrEqual(3);
      expect(contrast(DARK.ink, dark?.grass ?? DARK.ink)).toBeGreaterThanOrEqual(3);
    },
  );

  // Measured 2026-11-21 (second night chain, piece 5): the website's Spring (#afb84e) on the
  // grounds is 1.17–2.17:1, every team's body under 3:1 somewhere — the season colour stays
  // (owner 2026-11-20), so the figure's ink outline carries it apart from the grass.
  it("outlines every team's figure at 3:1 or more, and never thinner than 1.2 px, where its body is under 3:1 on a ground", () => {
    let carried = 0;
    TINTS.forEach(([light, dark]) => {
      for (const [l, ground] of [
        [LIGHT, light.grass],
        [DARK, dark.grass],
      ] as const) {
        for (const body of SEASON_COLOURS) {
          if (!ground || contrast(body, ground) >= 3) continue;
          carried += 1;
          expect(contrast(l.ink, ground), `${body} on ${ground}`).toBeGreaterThanOrEqual(3);
        }
      }
    });
    expect(carried).toBeGreaterThan(0);
    expect(inkWidth(1)).toBeGreaterThanOrEqual(1.2);
  });
});

describe("the minimap's frame and carriers", () => {
  it.each([
    ['Light', LIGHT, 0],
    ['Dark', DARK, 1],
  ] as const)(
    'frames the screen at 3:1 or more on every ground and on the panel, in %s',
    (_, l, dark) => {
      // The frame is a light line on a wider ink line: one of the two stands out.
      const grounds = [...TINTS.map((t) => t[dark].grass), l.panel];
      for (const g of grounds)
        expect(Math.max(contrast(l.ink, g), contrast(FRAME_LIGHT, g)), g).toBeGreaterThanOrEqual(3);
    },
  );

  it("sets a carrier's bomb dot off its hot ring at 3:1 or more", () => {
    expect(contrast(BOMB, HOT)).toBeGreaterThanOrEqual(3);
  });
});
