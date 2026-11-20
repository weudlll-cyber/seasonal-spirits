// Seasonal Sumo — one short match in the player client, at desktop and phone size: join, move,
// jump (the own ghost in the air), dash (the button's cooldown ring runs), live through a
// HALVING with the arena halving, the last-chance countdown and "MATCH OVER", and see the result
// screen with the awards and the bridge box. Screenshots of each step go to
// reports/screens/latest/play/ (git-ignored, the latest run only: stack.ts screenshotPath).

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { GHOST_AIRBORNE } from '@seasonal-spirits/protocol';
import {
  CENTRE,
  screenshotPath,
  joystick,
  keyboard,
  steerTo,
  view,
  type Steering,
} from './stack.js';

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: screenshotPath(info, `${info.project.name}-${name}`) });
}

// The last 10 s of the match: the countdown runs to the end ("LAST CHANCE"), then "MATCH OVER"
// with the flash, before the result.
async function lastChance(page: Page, info: TestInfo): Promise<void> {
  await expect
    .poll(async () => (await view(page)).countdown, { timeout: 70_000, intervals: [250] })
    .toMatchObject({ toEnd: true });
  expect((await view(page)).countdown?.ms).toBeLessThanOrEqual(10_000);
  await shot(page, info, 'last-chance');
  await expect(page.locator('#announce')).toHaveText('MATCH OVER', { timeout: 15_000 });
  await expect(page.locator('#result')).toBeHidden();
  await shot(page, info, 'match-over');
}

async function steering(page: Page, info: TestInfo): Promise<Steering> {
  return info.project.name === 'phone' ? joystick(page) : keyboard(page);
}

async function press(page: Page, info: TestInfo, action: 'dash' | 'jump'): Promise<void> {
  if (info.project.name === 'phone') await page.locator(`#${action}`).tap();
  else await page.keyboard.press(action === 'dash' ? 'Space' : 'Shift');
}

// A falling ghost can neither jump nor dash, and the bots may push the player off the small arena
// on its way: an action is pressed again until it took (within 15 s, a respawn included).
async function until(
  page: Page,
  info: TestInfo,
  action: 'dash' | 'jump',
  took: () => Promise<boolean>,
): Promise<void> {
  await expect(async () => {
    await press(page, info, action);
    await expect.poll(took, { timeout: 1000 }).toBe(true);
  }).toPass({ timeout: 15_000 });
}

const airborne = async (page: Page): Promise<boolean> =>
  (((await view(page)).own?.flags ?? 0) & GHOST_AIRBORNE) !== 0;

// The jump (NIGHT 2026-11-18), standing in the middle before any dash: Shift or the Jump button,
// in the air at once (a taken-over seat starts with the jump ready); then the landing — a dash
// needs the ground.
async function jumpAndLand(page: Page, info: TestInfo): Promise<void> {
  await until(page, info, 'jump', () => airborne(page));
  await shot(page, info, 'match');
  await expect.poll(() => airborne(page), { timeout: 3000 }).toBe(false);
}

// The dash: the server's cooldown starts.
async function dashOnce(page: Page, info: TestInfo): Promise<void> {
  await until(page, info, 'dash', async () => ((await view(page)).own?.dashLeftMs ?? 0) > 0);
}

test('join, move, dash, a halving, the last chance and the result with the bridge box', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const joined = await view(page);
  expect(joined.mode).toBe('player');
  // Joining during a result pause: the result screen covers the field (and the joystick).
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });
  const steer = await steering(page, info);

  // Move towards the middle of the arena and stop there.
  const start = (await view(page)).own ?? { x: 0, y: 0 };
  const moved = await steerTo(page, steer, CENTRE, async () => {
    const now = (await view(page)).own;
    return now !== null && Math.hypot(now.x - start.x, now.y - start.y) > 100;
  });
  expect(moved, 'the own ghost moves').toBe(true);
  await steer.hold(0, 0);
  await jumpAndLand(page, info);
  await steer.hold(1, 0);
  await expect(page.locator('#dash')).toBeVisible();
  await dashOnce(page, info);
  await steer.hold(0, 0);

  // The next halving: the announcement with the new season, and the arena halves.
  const announce = page.locator('#announce');
  const halving = /^HALVING — the arena halves · (Spring|Summer|Autumn|Winter) is in season$/;
  // The arena read in the countdown to a halving (not to the match's end): read earlier, a new
  // match in between starts at full size; read at the announcement, the edge may already be
  // easing in. Up to one season, or the rest of the last season, the result pause and one season.
  const toHalving = async () => {
    const c = (await view(page)).countdown;
    return c !== null && !c.toEnd;
  };
  await expect.poll(toHalving, { timeout: 45_000 }).toBe(true);
  const before = (await view(page)).area?.r ?? 0;
  await expect(announce).toHaveText(halving, { timeout: 15_000 });
  const match = halving.exec((await announce.textContent()) ?? '');
  const season = SEASON_NAMES.indexOf(match?.[1] ?? '');
  await expect.poll(async () => (await view(page)).season).toBe(season);
  await expect
    .poll(async () => (await view(page)).area?.r ?? 0, { timeout: 5000 })
    .toBeLessThan(before * 0.75);
  await shot(page, info, 'halving');

  await lastChance(page, info);
  await resultWithBridge(page, info);
});

// The result after the match, with the bridge box word for word.
async function resultWithBridge(page: Page, info: TestInfo): Promise<void> {
  const result = page.locator('#result');
  await expect(result).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#result-place')).toHaveText(
    /^Your place: \d+ of \d+ — \d+ knockouts?$/,
  );
  const awards = page.locator('#result-awards li');
  await expect(awards.first()).toBeVisible();
  for (const text of await awards.allTextContents()) {
    expect(text).toMatch(/^(Best pusher.+, \d+ knockouts?|Survivor.+, \d+:\d\d without a fall)$/);
  }
  await expect(page.locator('#bridge-text')).toHaveText(
    'This is how Seasonal Tokens work: every halving cuts in half — here it cuts the arena.',
  );
  await expect(page.getByRole('link', { name: 'Start here' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try the simulator' })).toHaveAttribute(
    'href',
    'https://seasonaltokens.org',
  );
  await expect(result.getByText('No financial advice')).toBeVisible();
  await shot(page, info, 'result');
}
