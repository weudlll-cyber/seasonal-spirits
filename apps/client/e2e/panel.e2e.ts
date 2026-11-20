// Seasonal Sumo — the admin panel in the viewer on the Sumo stack (rebuilt 2026-11-18 around
// "choose the game, set its values, start"): choosing Halving Bomb shows only the shared groups
// and Bomb's; a Bomb value changed in the draft leaves the running match alone; "Start Halving
// Bomb" ends the running match and Bomb's begins with that value. The stack's Sumo and its
// settings are started again at the end, for the specs after this one. Screenshots go to
// reports/screens/latest/panel/ (git-ignored, the latest run only: stack.ts screenshotPath).

import { expect, test, type Page } from '@playwright/test';
import { ADMIN_SETTINGS_PATH } from '@seasonal-spirits/protocol';
import { screenshotPath, SERVER_PORT, VIEWER_PORT } from './stack.js';

const URL = `http://localhost:${String(SERVER_PORT)}${ADMIN_SETTINGS_PATH}`;
const SHARED = ['movement', 'dash', 'jump', 'falling', 'flow', 'bots', 'botsEndgame'];

type Answer = { status: number; current: Record<string, number> | null };

// GET, or POST one command, from the viewer's page (the one the server allows).
function admin(page: Page, command: unknown = null): Promise<Answer> {
  return page.evaluate(
    async ({ url, command }) => {
      const init: RequestInit =
        command === null
          ? {}
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(command),
            };
      const r = await fetch(url, init);
      const body = r.ok ? ((await r.json()) as { current: Record<string, number> }) : null;
      return { status: r.status, current: body?.current ?? null };
    },
    { url: URL, command },
  );
}

const gameMode = (page: Page): Promise<string | null> =>
  page.evaluate(
    () =>
      (window as unknown as { __viewer?: { gameMode: string | null } }).__viewer?.gameMode ?? null,
  );

// A slider moved as a hand would: its value set, the input event fired.
async function slide(page: Page, key: string, value: number): Promise<void> {
  await page
    .locator(`#tuning [data-tab="next"] label[data-key="${key}"] input`)
    .evaluate((input, v) => {
      (input as HTMLInputElement).value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}

async function openPanel(page: Page): Promise<void> {
  await page.goto(`http://localhost:${String(VIEWER_PORT)}/`);
  await expect(page.locator('#tuning')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => gameMode(page), { timeout: 15_000 }).not.toBeNull();
}

test('choose Halving Bomb, set a Bomb value, start: Bomb begins with it', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'the phone looks at the panel only (below)');
  await openPanel(page);
  const panel = page.locator('#tuning');
  const next = panel.locator('[data-tab="next"]');
  const before = (await admin(page)).current;
  if (!before) throw new Error('the admin settings did not answer');
  // Nothing but the four games until one is chosen.
  await expect(next.locator('details')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Halving Bomb', exact: true }).click();
  const groups = await panel
    .locator('section:not([hidden]) details')
    .evaluateAll((all) => all.map((d) => (d as HTMLElement).dataset.group));
  expect(groups).toEqual([...SHARED, 'bomb']);
  for (const key of ['perBomb', 'maxSpeed'])
    await expect(next.locator(`[data-key="${key}"]`)).toHaveCount(1);
  for (const key of ['lives', 'zoneRadius', 'arenaRadius', 'rotation1', 'countdown'])
    await expect(next.locator(`[data-key="${key}"]`)).toHaveCount(0);
  // The draft changes nothing on the server or in the running match.
  await slide(page, 'perBomb', 4);
  await expect(next.locator('[data-key="perBomb"] output')).toHaveText('4 players');
  expect((await admin(page)).current?.perBomb).toBe(before.perBomb);
  expect(await gameMode(page)).toBe('sumo');
  await page.screenshot({ path: screenshotPath(info, 'desktop-admin-next') });
  await panel.getByRole('button', { name: 'Start Halving Bomb' }).click();
  await expect.poll(() => gameMode(page), { timeout: 5000 }).toBe('bomb');
  expect((await admin(page)).current?.perBomb).toBe(4);
  await expect(panel.locator('p.running')).toContainText('Halving Bomb');
  await page.screenshot({ path: screenshotPath(info, 'desktop-admin-running') });
  // The stack's own game and settings again.
  const back = await admin(page, {
    action: 'start',
    game: 'Sumo · Points',
    settings: before,
    keep: false,
  });
  expect(back.status).toBe(200);
  await expect.poll(() => gameMode(page), { timeout: 5000 }).toBe('sumo');
});

test('the panel on a phone: choose a game, its values readable', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the desktop starts a game (above)');
  await openPanel(page);
  await page.locator('#tuning').getByRole('button', { name: 'Halving Bomb', exact: true }).click();
  await expect(page.locator('#tuning [data-tab="next"] [data-key="perBomb"]')).toBeVisible();
  await page.screenshot({ path: screenshotPath(info, 'phone-admin-next') });
});
