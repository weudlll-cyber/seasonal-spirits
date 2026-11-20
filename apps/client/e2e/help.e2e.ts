// Seasonal Spirits — the help overlay (owner's observation 2026-11-15): shown on the first
// visit, not on the second, opened any time with "?" (key or band button), scrolled on the card
// and closed with "×" or a key (owner 2026-11-20); "What you see" names every marker on the field
// with its drawing (session 2026-11-16-LOOK-B). Screenshot <size>-help.png.

import { expect, test } from '@playwright/test';
import { LEGEND } from '@seasonal-spirits/render';
import { screenshotPath } from './stack.js';

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
  await page.screenshot({ path: screenshotPath(info, `${info.project.name}-help`) });
  const phone = info.project.name === 'phone';
  // On the card a touch or the wheel scrolls it and leaves it open (owner 2026-11-20).
  const card = help.locator('.card');
  if (phone) await card.tap({ position: { x: 100, y: 200 } });
  else {
    await card.hover();
    await page.mouse.wheel(0, 300);
    await expect.poll(() => card.evaluate((c) => c.scrollTop)).toBeGreaterThan(0);
  }
  await expect(help).toBeVisible();
  if (phone) await help.locator('.close').tap();
  else await page.keyboard.press('Escape');
  await expect(help).toBeHidden();

  await page.reload();
  await page.waitForTimeout(500); // the overlay would open in the first frame
  await expect(help).toBeHidden();

  if (phone) await page.locator('#help-open').tap();
  else await page.keyboard.press('?');
  await expect(help).toBeVisible();
  // A tap or a click beside the card closes it.
  await help.click({ position: { x: 4, y: 300 } });
  await expect(help).toBeHidden();
});
