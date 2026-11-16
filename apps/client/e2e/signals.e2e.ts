// Seasonal Spirits — team signals (owner decision 2026-11-16) in real browsers: pages join
// until one is on the sender's team and one on another; the sender presses 3 ("Attack"); the
// teammate's client shows the marker, the opponent's never does. Desktop size; screenshot
// desktop-signal.png (the teammate's view).

import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SCREENS, view } from './stack.js';

async function join(page: Page): Promise<{ ghost: number; team: number }> {
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const v = await view(page);
  return { ghost: v.ghost ?? -1, team: v.team ?? -1 };
}

test('a team signal shows for a teammate and never for an opponent', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'checked at desktop size');
  const sender = await join(page);
  let mate: Page | null = null;
  let opponent: Page | null = null;
  // Slots go to the team with the fewest players, so a teammate comes within a few pages.
  for (let i = 0; i < 8 && (!mate || !opponent); i++) {
    const p = await context.newPage();
    const { team } = await join(p);
    if (team === sender.team && !mate) mate = p;
    else if (team !== sender.team && !opponent) opponent = p;
    else await p.close();
  }
  if (!mate || !opponent) throw new Error('no teammate or opponent page');
  // No signal goes out during the result pause.
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });

  await page.bringToFront();
  await page.keyboard.press('Digit3');
  const sent = { ghost: sender.ghost, signal: 'attack' };
  const matePage = mate;
  await expect
    .poll(async () => (await view(matePage)).signals, { timeout: 5_000 })
    .toContainEqual(sent);
  await mate.screenshot({ path: path.join(SCREENS, 'desktop-signal.png') });
  // The opponent's client never has it, also a moment after the teammate's got it.
  expect((await view(opponent)).signals).toEqual([]);
  await opponent.waitForTimeout(500);
  expect((await view(opponent)).signals).toEqual([]);
});
