// Seasonal Sumo — the Sky Island look's text reads in both looks (owner 2026-11-18: contrast at
// least 4.5:1): the panels' text and the clock's countdown on the panel. (The season names on
// their colours went with the clock's season cells, NIGHT 2026-11-19.) And the ink outlines stand
// out on every season's ground at 3:1 at least: the minimap's marks (2026-11-19, minimap.ts).

import { describe, expect, it } from 'vitest';
import { DARK, LIGHT, SEASON_NAMES, type Look } from './palette.js';
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
    "outlines the minimap's marks at 3:1 or more on %s's ground, in Light and Dark",
    (_, i) => {
      const [light, dark] = TINTS[i] ?? [];
      expect(contrast(LIGHT.ink, light?.grass ?? LIGHT.ink)).toBeGreaterThanOrEqual(3);
      expect(contrast(DARK.ink, dark?.grass ?? DARK.ink)).toBeGreaterThanOrEqual(3);
    },
  );
});
