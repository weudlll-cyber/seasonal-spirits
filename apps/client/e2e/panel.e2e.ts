// Seasonal Sumo — the admin settings on the Sumo stack (NIGHT 2026-11-18, piece 7): a value changes
// play (the jump switched off: the client's Jump button goes, switched on: it is back), a preset
// saves and loads; the starting settings are back at the end, for the specs after this one. Talks
// to the endpoint as the panel does, from the page its server allows (playwright.config.ts).

import { expect, test, type Page } from '@playwright/test';
import { ADMIN_SETTINGS_PATH } from '@seasonal-spirits/protocol';
import { SERVER_PORT, view } from './stack.js';

const URL = `http://localhost:${String(SERVER_PORT)}${ADMIN_SETTINGS_PATH}`;

type Answer = { status: number; current: Record<string, number> | null; presets: string[] };

// GET, or POST one command, from the page; the answer's status and view.
function admin(page: Page, command: unknown = null): Promise<Answer> {
  return page.evaluate(
    async ({ url, command }) => {
      const r = await fetch(
        url,
        command === null
          ? {}
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(command),
            },
      );
      const body = r.ok
        ? ((await r.json()) as { current: Record<string, number>; presets: string[] })
        : null;
      return { status: r.status, current: body?.current ?? null, presets: body?.presets ?? [] };
    },
    { url: URL, command },
  );
}

test('a setting changes play, and a preset saves and loads', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'the endpoint is the same at every size');
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const start = (await admin(page)).current;
  if (!start) throw new Error('the admin settings did not answer');
  await expect(page.locator('#jump')).toBeVisible({ timeout: 20_000 });
  expect((await admin(page, { action: 'apply', settings: { ...start, jump: 0 } })).status).toBe(
    200,
  );
  await expect(page.locator('#jump')).toBeHidden();
  expect((await admin(page, { action: 'save', name: 'e2e-no-jump' })).presets).toContain(
    'e2e-no-jump',
  );
  await admin(page, { action: 'apply', settings: start });
  await expect(page.locator('#jump')).toBeVisible();
  expect((await admin(page, { action: 'load', name: 'e2e-no-jump' })).current?.jump).toBe(0);
  await expect(page.locator('#jump')).toBeHidden();
  await admin(page, { action: 'delete', name: 'e2e-no-jump' });
  expect((await admin(page, { action: 'apply', settings: start })).current).toEqual(start);
  await expect(page.locator('#jump')).toBeVisible();
});
