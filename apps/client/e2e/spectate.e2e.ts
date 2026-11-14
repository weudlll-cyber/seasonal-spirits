// Seasonal Spirits — the client with ?spectate=1 (desktop size): it watches the whole match
// with the season clock, a HALVING and the result, shows no controls, and sends nothing but
// its hello — not even when keys are pressed.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { SCREENS, SERVER_PORT, view } from './stack.js';

test('a spectator watches a halving and the result and sends nothing after its hello', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'the spectator view is checked at desktop size');
  const sent: string[] = [];
  // Only the match server's socket; Vite's own development socket pings on its own.
  page.on('websocket', (ws) => {
    if (!ws.url().includes(`:${SERVER_PORT}`)) return;
    ws.on('framesent', (f) => sent.push(String(f.payload)));
  });
  await page.goto('/?spectate=1');
  await expect.poll(async () => (await view(page)).mode, { timeout: 15_000 }).toBe('spectator');
  expect((await view(page)).ghost).toBeNull();
  await expect(page.locator('#notice')).toHaveText('Watching the match.');
  await expect(page.locator('#actions')).toBeHidden();
  await expect(page.locator('#stick')).toBeHidden();

  // Keys do nothing for a spectator.
  for (const key of ['KeyD', 'Space', 'Digit1', 'Digit2']) await page.keyboard.press(key);

  const announce = page.locator('#announce');
  await expect(announce).toBeVisible({ timeout: 45_000 });
  await expect(announce).toHaveText(/^HALVING — (Spring|Summer|Autumn|Winter) is in season$/);
  await page.screenshot({ path: path.join(SCREENS, 'spectator-halving.png') });

  await expect(page.locator('#result')).toBeVisible({ timeout: 70_000 });
  await expect(page.locator('#result-place')).toBeHidden();
  await expect(page.locator('#bridge-text')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENS, 'spectator-result.png') });

  expect(sent).toEqual(['{"kind":"spectator"}']);
});
