// Seasonal Sumo — touch targets on a phone (audit 2026-11-22 P6 item 4): the help's "×", the
// result's bridge links and every control of the admin panel at /admin/ are 44 px or more; the
// panel's Light/Dark switch keeps its small look and takes the taps around it. Why: a smaller
// target is missed by a thumb, and a style change can shrink one without any other spec noticing.

import { expect, test, type Page } from '@playwright/test';
import { view } from './stack.js';

const TARGET = 44;

// The visible elements of `selector` smaller than a target, as "what: width × height".
function small(page: Page, selector: string): Promise<string[]> {
  return page.evaluate(
    ({ selector, min }) =>
      [...document.querySelectorAll<HTMLElement>(selector)]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0)
        .filter(({ r }) => Math.round(r.height) < min || Math.round(r.width) < min)
        .map(({ el, r }) => {
          const what = `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 20)}"`;
          return `${what}: ${String(Math.round(r.width))} × ${String(Math.round(r.height))}`;
        }),
    { selector, min: TARGET },
  );
}

test("the help's × and the result's bridge links are 44 px targets", async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch targets: the phone');
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  await page.locator('#help-open').click();
  expect(await small(page, '#help .close')).toEqual([]);
  await page.keyboard.press('Escape');
  // The result's links measured where they stand, the result shown for it.
  await page.evaluate(() => {
    (document.getElementById('result') as HTMLElement).hidden = false;
  });
  expect(await small(page, '#bridge .link')).toEqual([]);
});

test('every control of the admin panel is a 44 px target', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'touch targets: the phone');
  await page.goto('/admin/');
  const panel = page.locator('#tuning');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  // A game chosen: its sliders, fields and switches show.
  await panel.locator('[data-tab="next"] .games button').first().click();
  await panel
    .locator('[data-tab="next"] details')
    .first()
    .evaluate((d) => {
      (d as HTMLDetailsElement).open = true;
    });
  const controls =
    '#tuning button, #tuning select, #tuning input:not([type="checkbox"]), #tuning summary, #tuning label.switch';
  expect(await small(page, controls)).toEqual([]);
  // The Light/Dark switch: a tap just below its pill still reaches it.
  const box = await page.locator('#look').boundingBox();
  if (!box) throw new Error('no Light/Dark switch');
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id ?? null, {
    x: box.x + box.width / 2,
    y: box.y + box.height + 10,
  });
  expect(hit).toBe('look');
});
