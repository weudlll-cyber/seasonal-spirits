// Seasonal Spirits — the help overlay (owner's observation 2026-11-15): shown on the first
// visit, not on the second, opened any time with "?" (key or band button), closed with one
// key or tap; "What you see" names every marker on the field with its drawing (session
// 2026-11-16-LOOK-B). Screenshot <size>-help.png.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { LEGEND } from '@seasonal-spirits/render';
import { SCREENS } from './stack.js';

const RULES = 4; // the numbered rules above "What you see" — three and the jump —, one drawing each

// A first visit: nothing remembered in the browser.
test.use({ storageState: { cookies: [], origins: [] } });

test('help appears on the first visit, not on the second, and opens again with "?"', async ({
  page,
}, info) => {
  const help = page.locator('#help');
  await page.goto('/');
  await expect(help).toBeVisible();
  // The three rules of Sumo and the jump.
  await expect(help).toContainText('Push the other teams off the arena');
  await expect(help).toContainText('Dash with Space or the Dash button');
  await expect(help).toContainText('At every halving the arena halves');
  await expect(help).toContainText('Jump with Shift or the Jump button');
  await expect(help).toContainText('What you see');
  for (const { text } of LEGEND) await expect(help).toContainText(text);
  await expect(help.locator('svg')).toHaveCount(RULES + LEGEND.length);
  await page.screenshot({ path: path.join(SCREENS, `${info.project.name}-help.png`) });
  const phone = info.project.name === 'phone';
  if (phone) await help.tap();
  else await page.keyboard.press('Escape');
  await expect(help).toBeHidden();

  await page.reload();
  await page.waitForTimeout(500); // the overlay would open in the first frame
  await expect(help).toBeHidden();

  if (phone) await page.locator('#help-open').tap();
  else await page.keyboard.press('?');
  await expect(help).toBeVisible();
});
