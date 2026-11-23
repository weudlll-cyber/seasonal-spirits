// Seasonal Sumo — the result fits a phone without scrolling: at four phone sizes the whole result,
// the bridge box's links included, shows with no text under 14 px; only the players' list scrolls.

import { expect, test } from '@playwright/test';
import { matchRunning, screenshotPath } from './stack.js';

const SIZES = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 360, height: 780 },
  { width: 430, height: 932 },
];

test('the result fits each phone size whole, the bridge box in view, 14 px text at least', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'the sizes are set here; one browser is enough');
  await page.setViewportSize(SIZES[0] ?? { width: 375, height: 667 });
  await page.goto('/');
  // This match's result, not the end of the last one's pause; a whole short match at most.
  await matchRunning(page);
  await expect(page.locator('#result')).toBeVisible({ timeout: 100_000 });
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300); // the kit fits again in the frame after a resize
    // In one read: the result is up only 15 s (BACKLOG ai).
    const seen = await page.evaluate(() => {
      const box = document.getElementById('result');
      const inView = (sel: string): boolean => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        return !!r && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
      };
      const texts = [...(box?.querySelectorAll<HTMLElement>('h1, h3, p, li, a') ?? [])];
      const area = document.getElementById('result-players-area');
      return {
        shown: box?.checkVisibility() ?? false,
        pageScrolls: box ? box.scrollHeight - box.clientHeight : -1,
        bridge: ['#start-here', '#simulator', '#bridge .small'].every(inView),
        smallest: Math.min(...texts.map((e) => parseFloat(getComputedStyle(e).fontSize))),
        areaNamed:
          area?.getAttribute('role') === 'region' &&
          document.getElementById(area.getAttribute('aria-labelledby') ?? '')?.textContent ===
            'Players',
      };
    });
    const at = `${String(size.width)}×${String(size.height)}`;
    expect(seen.shown, `${at}: the result was still up`).toBe(true);
    expect(seen.pageScrolls, `${at}: the result does not scroll`).toBeLessThanOrEqual(0);
    expect(seen.bridge, `${at}: the bridge box's buttons and line in view`).toBe(true);
    expect(seen.smallest, `${at}: no text under 14 px`).toBeGreaterThanOrEqual(14);
    expect(seen.areaNamed, `${at}: the players' list is a named region`).toBe(true);
  }
  await page.screenshot({ path: screenshotPath(info, 'result-430x932') });
});
