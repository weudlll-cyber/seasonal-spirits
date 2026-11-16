// Seasonal Spirits — `pnpm looks` (sessions 2026-11-16-LOOK and -LOOK-B): pictures of the
// ghosts as the game draws them. Finds the three scenes in seeded matches (looks-scenes.ts) —
// a crowd, a carrier after a halving, a carrier, a securing ghost and the own ghost — draws each at
// 1280 × 800 and 390 × 844 (the viewer's looks.html) and writes look-<n>-<scene>-<size>.png and
// look-scenes.json to reports/screens/latest/. Pictures, not a test.

import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { findScenes } from './looks-scenes.js';
import { SCREENS } from './stack.js';

const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };

test('ghost look: three scenes at desktop and phone size', async ({ page }) => {
  test.setTimeout(300_000);
  const scenes = findScenes();
  fs.mkdirSync(SCREENS, { recursive: true });
  for (const [i, scene] of scenes.entries()) {
    for (const [size, viewport] of Object.entries(SIZES)) {
      await page.setViewportSize(viewport);
      await page.goto('/looks.html');
      await page.waitForFunction(() => 'drawLook' in window);
      await page.evaluate((s) => {
        (window as unknown as { drawLook: (s: unknown) => void }).drawLook(s);
      }, scene);
      const name = `look-${i + 1}-${scene.key}-${size}.png`;
      await page.screenshot({ path: path.join(SCREENS, name) });
    }
  }
  const summary = scenes.map((s) => ({
    key: s.key,
    seed: s.seed,
    matchMs: s.matchMs,
    ownId: s.ownId,
  }));
  fs.writeFileSync(
    path.join(SCREENS, 'look-scenes.json'),
    `${JSON.stringify(summary, null, 1)}
`,
  );
});
