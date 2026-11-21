// Seasonal Sumo — the season colours the game draws (render palette.ts) are the website's, as the
// pinned kit's tokens.css holds them (owner decision 2026-11-20): a new kit tag with other colours
// fails here. Here and not in render, which has no Node types (browser code only).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEASON_COLOURS, SEASON_NAMES } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';

describe('the season colours', () => {
  it("are the website's, as the pinned kit's tokens.css holds them", () => {
    const tokens = readFileSync(
      fileURLToPath(import.meta.resolve('@seasonal/kit/tokens.css')),
      'utf8',
    );
    SEASON_NAMES.forEach((name, i) => {
      const m = new RegExp(`--color-${name.toLowerCase()}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens);
      expect(SEASON_COLOURS[i]?.toLowerCase(), name).toBe(m?.[1]?.toLowerCase());
    });
  });
});
