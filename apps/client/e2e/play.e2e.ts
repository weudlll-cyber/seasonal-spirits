// Seasonal Spirits — one short match in the player client, at desktop and phone size: join,
// move, reach the own shrine and read both buttons, live through a HALVING with the new
// season's coins, the last-chance countdown and "MATCH OVER", and see the result screen with
// the bridge box. Screenshots of each step go to reports/screens/latest/ (git-ignored).

import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { SCREENS, joystick, keyboard, ownShrine, steerTo, view, type Steering } from './stack.js';

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENS, `${info.project.name}-${name}.png`) });
}

// The last 10 s of the match: the countdown runs to the end (the clock says "LAST CHANCE —
// secure now"), then "MATCH OVER" with the flash, before the result.
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

test('join, move, shrine buttons, a halving, the last chance and the result with the bridge box', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const joined = await view(page);
  expect(joined.mode).toBe('player');
  const team = joined.team ?? 0;
  // Joining during a result pause: the result screen covers the field (and the joystick).
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });
  const steer = await steering(page, info);

  // Move: away from the own shrine, towards the middle.
  const start = joined.own ?? { x: 0, y: 0 };
  const moved = await steerTo(page, steer, { x: 1000, y: 1000 }, async () => {
    const now = (await view(page)).own;
    return now !== null && Math.hypot(now.x - start.x, now.y - start.y) > 150;
  });
  expect(moved, 'the own ghost moves').toBe(true);
  await shot(page, info, 'match');

  // Back into the own shrine: the action button gives way to the two labelled buttons, for
  // three polls in a row: when the walk home crosses a match end, the new match puts the
  // ghost into the shrine for a moment while the held direction still carries it on (seen
  // 2026-11-16 when the spec joined late in a match).
  const shrine = page.locator('#shrine');
  let inShrineFor = 0;
  const atShrine = await steerTo(page, steer, ownShrine(team), async () => {
    inShrineFor = (await shrine.isVisible()) ? inShrineFor + 1 : 0;
    return inShrineFor >= 3;
  });
  expect(atShrine, 'the shrine buttons appear at the own shrine').toBe(true);
  await expect(page.locator('#secure')).toHaveText(/^Secure \(\d+(\.5)?\)$/);
  await expect(page.locator('#swap')).toHaveText(
    /^Swap \(\d+ (Spring|Summer|Autumn|Winter), worth \d+(\.5)? now \/ \d+(\.5)? later\)$/,
  );
  await expect(page.locator('#steal')).toBeHidden();
  await shot(page, info, 'shrine');

  // The next halving: announcement with the new season, and that season's coins fall.
  const announce = page.locator('#announce');
  const halving = /^HALVING — (Spring|Summer|Autumn|Winter) is in season$/;
  // Up to one season, or the rest of the last season, the result pause and one season.
  await expect(announce).toHaveText(halving, { timeout: 45_000 });
  const text = (await announce.textContent()) ?? '';
  const match = halving.exec(text);
  expect(match, text).not.toBeNull();
  const season = SEASON_NAMES.indexOf(match?.[1] ?? '');
  await expect.poll(async () => (await view(page)).season).toBe(season);
  await expect.poll(async () => (await view(page)).coins, { timeout: 10_000 }).toBeGreaterThan(0);
  await shot(page, info, 'halving');

  await lastChance(page, info);
  await resultWithBridge(page, info);
});

// The result after the match, with the bridge box word for word.
async function resultWithBridge(page: Page, info: TestInfo): Promise<void> {
  const result = page.locator('#result');
  await expect(result).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#result-place')).toHaveText(/^Your place: \d+ of \d+/);
  // The recap's awards: 32 bots for a minute always steal and secure.
  const awards = page.locator('#result-awards li');
  await expect(awards.first()).toBeVisible();
  for (const text of await awards.allTextContents()) {
    expect(text).toMatch(
      /^(Biggest steal.+ took \d+ from .+|Closest save.+, \d+\.\d s left|Last secure.+, \d+(\.5)?)$/,
    );
  }
  await expect(page.locator('#bridge-text')).toHaveText(
    'This is how Seasonal Tokens work: hold the season, swap before it turns, expect less after the halving.',
  );
  await expect(page.getByRole('link', { name: 'Start here' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try the simulator' })).toHaveAttribute(
    'href',
    'https://seasonaltokens.org',
  );
  await expect(result.getByText('No financial advice')).toBeVisible();
  await shot(page, info, 'result');
}
