// Seasonal Spirits — the help overlay (owner's observation 2026-11-15): shown on the first
// visit, not on the second, opened any time with "?" (key or band button), closed with one
// key or tap; "What you see" names every marker on the field with its drawing (session
// 2026-11-16-LOOK-B). Screenshot <size>-help.png.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { LEGEND } from '@seasonal-spirits/render';
import { SCREENS } from './stack.js';

const RULES = 5; // the numbered rules above "What you see", one drawing each

// A first visit: nothing remembered in the browser.
test.use({ storageState: { cookies: [], origins: [] } });

test('help appears on the first visit, not on the second, and opens again with "?"', async ({
  page,
}, info) => {
  const help = page.locator('#help');
  await page.goto('/');
  await expect(help).toBeVisible();
  // The five rules of V5 (owner decision 2026-11-16), the price board among them.
  await expect(help).toContainText('Coins of all four seasons fall');
  await expect(help).toContainText('the season in season 4, the next season 2, the other two 1');
  await expect(help).toContainText('comes the halving: the next season comes into season');
  await expect(help).toContainText('Coins still carried at the end count nothing');
  await expect(help).toContainText('The team with the most secured points wins');
  await expect(help).toContainText('What you see');
  for (const { text } of LEGEND) await expect(help).toContainText(text);
  await expect(help).toContainText('A trail behind a ghost: it carries coins.');
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
