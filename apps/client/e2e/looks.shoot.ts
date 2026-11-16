// Seasonal Spirits — `pnpm looks` (session 2026-11-16-LOOK): the pictures the owner chooses a
// ghost look from. Finds the three scenes in seeded matches (looks-scenes.ts), draws each in
// looks A, B and C at 1280 × 800 and the crowd also at 390 × 844 (the viewer's looks.html),
// and writes the PNGs and scenes.json to reports/screens/latest/looks/. Pictures, not a test.

import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import type { GhostLook } from '@seasonal-spirits/render';
import { findScenes, type LookScene } from './looks-scenes.js';
import { SCREENS } from './stack.js';

const OUT = path.join(SCREENS, 'looks');
const LOOKS: GhostLook[] = ['A', 'B', 'C'];
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

test('ghost looks: three scenes in three looks', async ({ page }) => {
  test.setTimeout(300_000);
  const scenes = findScenes();
  fs.mkdirSync(OUT, { recursive: true });
  const shots: { scene: LookScene; look: GhostLook; size: typeof DESKTOP; name: string }[] = [];
  scenes.forEach((scene, i) => {
    for (const look of LOOKS) {
      shots.push({ scene, look, size: DESKTOP, name: `${i + 1}-${scene.key}-${look}-desktop` });
    }
  });
  const [crowd] = scenes;
  if (crowd) {
    for (const look of LOOKS) {
      shots.push({ scene: crowd, look, size: PHONE, name: `1-crowd-${look}-phone` });
    }
  }
  for (const shot of shots) {
    await page.setViewportSize(shot.size);
    await page.goto('/looks.html');
    await page.waitForFunction(() => 'drawLook' in window);
    await page.evaluate(
      ([scene, l]) => {
        (window as unknown as { drawLook: (s: unknown, l: string) => void }).drawLook(scene, l);
      },
      [shot.scene, shot.look] as const,
    );
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
  }
  const summary = scenes.map((s) => ({
    key: s.key,
    seed: s.seed,
    matchMs: s.matchMs,
    ownId: s.ownId,
  }));
  fs.writeFileSync(path.join(OUT, 'scenes.json'), `${JSON.stringify(summary, null, 1)}\n`);
});
