// Seasonal Spirits — what the owner's play test of 2026-11-15 asked for, at desktop and phone
// size: "You are Team <Season>", the own shrine labelled, in "Near" the minimap and the
// "Your shrine" arrow when the shrine is out of sight, V or the corner button switching to
// "Overview" and the choice surviving a reload, and no name label under the top bar.
// Screenshots: <size>-near.png and <size>-overview.png in reports/screens/latest/.

import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { SCREENS, joystick, keyboard, ownShrine, steerTo, view, type Steering } from './stack.js';

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
const LABEL_HEIGHT = 14; // packages/render/src/labels.ts

async function joined(page: Page): Promise<number> {
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  // Joining during a result pause: the result screen covers the field (and the joystick).
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });
  return (await view(page)).team ?? 0;
}

async function labelsBelowBar(page: Page): Promise<void> {
  const v = await view(page);
  for (const l of v.labels) {
    expect(l.y - LABEL_HEIGHT, `label "${l.text}" under the bar`).toBeGreaterThanOrEqual(
      v.barBottom,
    );
  }
}

async function switchView(page: Page, info: TestInfo): Promise<void> {
  if (info.project.name === 'phone') await page.locator('#view').tap();
  else await page.keyboard.press('KeyV');
}

async function steering(page: Page, info: TestInfo): Promise<Steering> {
  return info.project.name === 'phone' ? joystick(page) : keyboard(page);
}

test('team line, own shrine, minimap and arrow in Near, Overview remembered, labels below the bar', async ({
  page,
}, info) => {
  const shot = (name: string): Promise<Buffer> =>
    page.screenshot({ path: path.join(SCREENS, `${info.project.name}-${name}.png`) });
  await page.goto('/');
  const team = await joined(page);
  await expect(page.locator('#team')).toHaveText(`You are Team ${SEASON_NAMES[team] ?? ''}`);
  await expect(page.locator('#team')).toBeVisible();
  const start = await view(page);
  expect(start.view).toBe('near');
  expect(start.minimap).toBe(true);
  await labelsBelowBar(page);
  const steer = await steering(page, info);

  // Home first (a player takes over a bot's ghost wherever it stands): the shrine in sight.
  const home = async (): Promise<boolean> => {
    const v = await view(page);
    return v.shrineOnScreen && !v.arrow;
  };
  expect(await steerTo(page, steer, ownShrine(team), home), 'the own shrine in sight').toBe(true);
  await labelsBelowBar(page);

  // Out to the middle: the shrine leaves the screen and the arrow points to it.
  const away = await steerTo(
    page,
    steer,
    { x: 1000, y: 1000 },
    async () => (await view(page)).arrow,
  );
  expect(away, 'the "Your shrine" arrow appears with the shrine out of sight').toBe(true);
  expect((await view(page)).shrineOnScreen).toBe(false);
  await labelsBelowBar(page);
  await shot('near');

  // Back home: the shrine is in sight again, the arrow goes.
  const back = await steerTo(page, steer, ownShrine(team), home);
  expect(back, 'the own shrine comes back into sight').toBe(true);
  await labelsBelowBar(page);

  // Overview: the whole field, no minimap; the choice survives a reload.
  await switchView(page, info);
  await expect.poll(async () => (await view(page)).view).toBe('overview');
  const overview = await view(page);
  expect(overview.minimap).toBe(false);
  expect(overview.shrineOnScreen).toBe(true);
  await labelsBelowBar(page);
  await shot('overview');
  await page.reload();
  await joined(page);
  await expect.poll(async () => (await view(page)).view).toBe('overview');
  await expect(page.locator('#view')).toHaveText('View: Overview');
  await switchView(page, info);
  await expect.poll(async () => (await view(page)).view).toBe('near');
  await expect(page.locator('#view')).toHaveText('View: Near');
});
