// Seasonal Spirits — the own ghost answers a key press at once (session 2026-11-16-RESPONSE):
// from standing, the drawn own ghost moves within RESPONSE_BOUND_MS of the key, in the median
// of a few presses. Desktop keyboard only; the joystick takes the same path into the client.

import { expect, test } from '@playwright/test';
import { spread } from '@seasonal-spirits/game-core';
import { Analysis } from './latency.js';
import { installRecorder, readRecording } from './recorder.js';
import { keyboard, pressFromStanding, view } from './stack.js';

// Measured on 2026-11-16 (reports/response): 8 ms median, 14 ms p90 with the prediction;
// 113 ms median, 80 ms p10 before it. The bound leaves a slow CI runner three frames.
const RESPONSE_BOUND_MS = 50;
const PRESSES = 8; // a press may fall into a result pause and be dropped

test('the own ghost moves within the response bound of a key press', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard presses');
  await installRecorder(page);
  await page.goto('/');
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });
  const from = await pressFromStanding(page, keyboard(page), PRESSES);
  const ownId = (await view(page)).ghost ?? -1;
  const samples = new Analysis(await readRecording(page), ownId).keySamples(from);
  const ms = samples.map((s) => s.totalMs);
  expect(ms.length).toBeGreaterThanOrEqual(5);
  expect(spread(ms).median, `key → drawn moving, ms: ${ms.join(', ')}`).toBeLessThanOrEqual(
    RESPONSE_BOUND_MS,
  );
});
