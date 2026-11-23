// Seasonal Sumo — one short match in the player client at desktop and phone size: join, move,
// jump, dash, a HALVING, the last-chance countdown, "MATCH OVER", the result with the bridge box.

import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { GHOST_AIRBORNE } from '@seasonal-spirits/protocol';
import {
  CENTRE,
  screenshotPath,
  joystick,
  keyboard,
  matchRunning,
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
  await matchRunning(page);
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
  // Not in the result pause: an ended match keeps its last countdown without the to-end flag, and
  // the next halving was a result pause and a season away (BACKLOG ai, 2026-11-21).
  const toHalving = async () => {
    const v = await view(page);
    return !v.result && v.countdown !== null && !v.countdown.toEnd;
  };
  await expect.poll(toHalving, { timeout: 45_000 }).toBe(true);
  const { area, halvings } = await view(page);
  const before = area?.r ?? 0;
  // This halving, not the last one: the hidden banner keeps the previous halving's words, which
  // matched at once and left the arena unchanged (BACKLOG ai, measured 2026-11-21). The client's
  // halving count rises at the event, and the banner shows.
  await expect
    .poll(async () => (await view(page)).halvings, { timeout: 15_000 })
    .toBeGreaterThan(halvings);
  await expect(announce).toBeVisible();
  await expect(announce).toHaveText(halving);
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

// The result after the match, with the bridge box word for word. Read in one go the moment it
// shows: it stays only RESULT_SECONDS (15 s on this stack), and on a loaded PC a dozen separate checks outlasted
// it and found the next match (BACKLOG ai, 20-run measurement 2026-11-21).
async function resultWithBridge(page: Page, info: TestInfo): Promise<void> {
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  const seen = await page.evaluate(() => {
    const result = document.querySelector('#result');
    const text = (sel: string) => document.querySelector(sel)?.textContent ?? '';
    const link = (name: string) =>
      [...(result?.querySelectorAll('a') ?? [])].find((a) => a.textContent === name);
    return {
      shown: result?.checkVisibility() ?? false,
      place: text('#result-place'),
      awards: [...document.querySelectorAll('#result-awards li')].map((li) => li.textContent),
      awardsShown: document.querySelector('#result-awards-box')?.checkVisibility() ?? false,
      bridge: text('#bridge-text'),
      startHere: link('Start here')?.checkVisibility() ?? false,
      simulator: link('Try the simulator')?.getAttribute('href') ?? null,
      advice: [...(result?.querySelectorAll('p') ?? [])].some(
        (p) => p.textContent === 'No financial advice' && p.checkVisibility(),
      ),
    };
  });
  await shot(page, info, 'result');
  expect(seen.shown, 'the result was still up when read').toBe(true);
  expect(seen.place).toMatch(/^Your place: \d+ of \d+ — \d+ knockouts?$/);
  expect(seen.awardsShown, 'the awards show').toBe(true);
  expect(seen.awards.length).toBeGreaterThan(0);
  for (const text of seen.awards) {
    expect(text).toMatch(/^(Best pusher.+, \d+ knockouts?|Survivor.+, \d+:\d\d without a fall)$/);
  }
  expect(seen.bridge).toBe(
    'This is how Seasonal Tokens work: every halving cuts in half — here it cuts the arena.',
  );
  expect(seen.startHere, 'the Start here link shows').toBe(true);
  expect(seen.simulator).toBe('https://seasonaltokens.org');
  expect(seen.advice, 'the no-financial-advice line shows').toBe(true);
}
