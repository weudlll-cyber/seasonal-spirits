// Seasonal Sumo — the page's decorative motion under the system's reduced-motion setting (audit
// 2026-11-22 P6 item 6): the halving's white flash runs without it and not with it. Why: the flash
// is a full-screen blink, which the setting asks to stop; the game's own motion stays.

import { expect, test, type Page } from '@playwright/test';

// The animation the flash runs when a halving starts it (hud.ts adds `go`).
async function flashAnimation(page: Page): Promise<string> {
  await page.goto('/');
  return page.locator('#flash').evaluate((el) => {
    el.classList.add('go');
    return getComputedStyle(el).animationName;
  });
}

test('the halving flash runs, and not with reduced motion', async ({ page }) => {
  expect(await flashAnimation(page)).toBe('flash');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await flashAnimation(page)).toBe('none');
});
