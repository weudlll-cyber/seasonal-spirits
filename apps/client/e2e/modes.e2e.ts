// Seasonal Sumo — King of the Season and Halving Bomb in the player client, at desktop and phone
// size (NIGHT 2026-11-18, piece 7), each on its own short-match stack: join, move, dash, jump
// (the own ghost in the air), in Bomb the carriers and the labels' score rule, live to "MATCH
// OVER" and see the result with the mode's awards and the bridge box. Screenshots go to
// reports/screens/latest/modes/ (git-ignored, the latest run only: stack.ts screenshotPath).

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { GHOST_AIRBORNE } from '@seasonal-spirits/protocol';
import {
  CENTRE,
  MODE_STACKS,
  screenshotPath,
  joystick,
  keyboard,
  matchRunning,
  steerTo,
  view,
} from './stack.js';

const AWARDS = {
  hill: /^(King.+, \d+ s in the zone|Bouncer.+, \d+ pushed out of the zone)$/,
  bomb: /^(Hot hands.+, \d+ bombs passed|Cool head.+, \d+ points)$/,
};

async function act(page: Page, info: TestInfo, action: 'dash' | 'jump'): Promise<void> {
  if (info.project.name === 'phone') await page.locator(`#${action}`).tap();
  else await page.keyboard.press(action === 'dash' ? 'Space' : 'Shift');
}

for (const mode of ['hill', 'bomb'] as const) {
  test(`${mode}: join, move, dash, jump, the end and the recap`, async ({ page }, info) => {
    const shot = (name: string) =>
      page.screenshot({ path: screenshotPath(info, `${info.project.name}-${mode}-${name}`) });
    await page.addInitScript(() => {
      localStorage.setItem('seasonal-spirits.help-seen', '1');
    });
    await page.goto(`http://localhost:${String(MODE_STACKS[mode].client)}/`);
    await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
    expect((await view(page)).gameMode).toBe(mode);
    await matchRunning(page);
    const steer = info.project.name === 'phone' ? await joystick(page) : keyboard(page);
    const start = (await view(page)).own ?? { x: 0, y: 0 };
    const moved = await steerTo(page, steer, CENTRE, async () => {
      const now = (await view(page)).own;
      return now !== null && Math.hypot(now.x - start.x, now.y - start.y) > 80;
    });
    expect(moved, 'the own ghost moves').toBe(true);
    await act(page, info, 'dash');
    await expect.poll(async () => (await view(page)).own?.dashLeftMs ?? 0).toBeGreaterThan(0);
    await act(page, info, 'jump');
    await expect
      .poll(async () => ((await view(page)).own?.flags ?? 0) & GHOST_AIRBORNE, { timeout: 2000 })
      .toBe(GHOST_AIRBORNE);
    await shot('jump');
    // Halving Bomb (NIGHT 2026-11-18, piece 5): bombs are out all match, their carriers
    // unmistakable; scores only for the top three and the own ghost.
    if (mode === 'bomb') {
      await shot('carrier');
      const scored = (await view(page)).labels.filter((l) => !l.own && l.text.includes(' · '));
      expect(scored.length).toBeLessThanOrEqual(3);
    }
    await steer.hold(0, 0);
    // This match's end, shown: the hidden banner keeps the last match's "MATCH OVER" (as BACKLOG
    // ai's halving), which matched at once on a stack that had played a match (2026-11-21).
    const over = page.locator('#announce');
    await expect
      .poll(() => over.evaluate((e: HTMLElement) => !e.hidden && e.textContent === 'MATCH OVER'), {
        timeout: 75_000,
      })
      .toBe(true);
    await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
    const awards = page.locator('#result-awards li');
    for (const text of await awards.allTextContents()) expect(text).toMatch(AWARDS[mode]);
    await expect(page.locator('#bridge-text')).toBeVisible();
    await shot('result');
  });
}
