// Seasonal Sumo — the texts' style as the browser applies it, at desktop and phone size: the
// fonts by DECISIONS D7 (kit K4) — Fredoka for the game's own texts over the play field, Luxora
// Grotesk for every official part. Why: a stylesheet change can move a text to the other font
// without any other spec noticing.

import { expect, test, type Page } from '@playwright/test';
import { view } from './stack.js';

// The first family of the element's computed font.
async function family(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0]?.replace(/["']/g, '') ?? '');
}

test('the game texts are in Fredoka, the official ones in Luxora Grotesk', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  await page.locator('#help-open').click();
  await expect(page.locator('#help h2')).toBeVisible();
  const game = ['#announce', '#scores .score', '#hint', '#dash', '#jump', '#dash .key'];
  const official = ['#help h2', '#help li span', '#help .close', '#start h1', '#team', '#mute'];
  for (const s of game) expect(await family(page, s), s).toBe('Fredoka');
  for (const s of official) expect(await family(page, s), s).toBe('Luxora Grotesk');
});
