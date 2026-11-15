// Seasonal Spirits — the help overlay (owner's observation 2026-11-15): shown on the first
// visit, not on the second, opened any time with "?" (key or band button), closed with one
// key or tap. Screenshot <size>-help.png.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { SCREENS } from './stack.js';

// A first visit: nothing remembered in the browser.
test.use({ storageState: { cookies: [], origins: [] } });

test('help appears on the first visit, not on the second, and opens again with "?"', async ({
  page,
}, info) => {
  const help = page.locator('#help');
  await page.goto('/');
  await expect(help).toBeVisible();
  await expect(help).toContainText('Only the coins of the current season fall');
  await expect(help).toContainText('Swap turns 10 coins of this season into 15 of the next');
  await expect(help).toContainText('halving');
  await expect(help).toContainText('others can steal from you');
  await expect(help.locator('svg')).toHaveCount(5);
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
