// Seasonal Spirits — the help overlay (owner's observation 2026-11-15): shown on the first
// visit, not on the second, opened any time with "?" (key or band button), scrolled on the card
// and closed with "×" or a key (owner 2026-11-20), read to its end with the keyboard (DECISIONS
// D3); it offers the game's source (AGPL); "What you see" names every marker on the field with its drawing (session
// 2026-11-16-LOOK-B). Screenshot <size>-help.png.

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

// DECISIONS D3: a keyboard player reads the card to its end — it opens with the focus on its
// "×", the scroll keys move it to the end and back and leave it open, Esc closes it (audit
// 2026-11-22 P6 item 3: any key closed it).
test('the help is read to its end with the keyboard and closed with Esc', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'a keyboard on a desktop');
  const help = page.locator('#help');
  const card = help.locator('.card');
  await page.goto('/');
  await expect(help).toBeVisible();
  await expect(help.locator('.close')).toBeFocused();
  const end = (): Promise<number> =>
    card.evaluate((c) => c.scrollHeight - c.clientHeight - c.scrollTop);
  expect(await end()).toBeGreaterThan(1); // more lies below at 1280 × 800
  for (let i = 0; i < 20 && (await end()) > 1; i++) await page.keyboard.press('PageDown');
  expect(await end()).toBeLessThanOrEqual(1);
  await expect(card).not.toHaveClass(/more/);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await expect.poll(() => card.evaluate((c) => c.scrollTop)).toBe(0);
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
});

// Audit 2026-11-22 P7 item 3: every player of a running copy is offered the game's source (AGPL
// §13); a tap on the link opens it and leaves the card open.
test("the help offers the game's source, and a tap on it opens a new tab", async ({ page }) => {
  await page.goto('/');
  const link = page.locator('#help a', { hasText: 'Source (AGPL)' });
  await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\/.+\/seasonal-spirits$/);
  await expect(link).toHaveAttribute('target', '_blank');
  await link.scrollIntoViewIfNeeded();
  // The tab is not loaded: the link's request is answered here, nothing leaves the machine.
  await page.context().route('https://github.com/**', (r) => r.fulfill({ body: 'source' }));
  const opened = page.waitForEvent('popup');
  await link.click();
  await opened;
  await expect(page.locator('#help')).toBeVisible();
});
