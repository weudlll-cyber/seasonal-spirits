// Seasonal Spirits — steal feedback against the staged steal (SCENARIO=steal, port 5934): the
// joining player stands beside an opponent hunter carrying nothing. The hunter robs the player
// ("Bot n stole 3 from you"); the Steal button lights up and the range ring shows while the
// hunter carries; Space robs it back ("You stole 2 from Bot n"); walking away dims the button.
// Desktop size; screenshot desktop-steal.png.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { SCREENS, STEAL_CLIENT_PORT, view } from './stack.js';

test('the Steal button is lit only with a target, and both sides of a steal get a message', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'checked at desktop size');
  await page.goto(`http://localhost:${STEAL_CLIENT_PORT}/`);
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const toast = page.locator('#toast');
  const steal = page.locator('#steal');

  await expect(toast).toHaveText(/^(Bot|Player) \d+ stole \d+ from you$/, { timeout: 10_000 });
  await expect(steal).toHaveClass(/\blit\b/, { timeout: 5_000 });
  expect((await view(page)).stealRing).toBe(true);

  // Press while lit (the robber walks off with the loot): within a few tries it lands.
  const robbed = /^You stole \d+ from (Bot|Player) \d+$/;
  for (let i = 0; i < 40 && !robbed.test((await toast.textContent()) ?? ''); i++) {
    if ((await steal.getAttribute('class'))?.includes('lit')) await page.keyboard.press('Space');
    await page.waitForTimeout(200);
  }
  await expect(toast).toHaveText(robbed);
  await page.screenshot({ path: path.join(SCREENS, 'desktop-steal.png') });

  // Away from every carrier: nothing to take, the button dims.
  await page.keyboard.down('KeyW');
  await expect(steal).not.toHaveClass(/\blit\b/, { timeout: 5_000 });
  await page.keyboard.up('KeyW');
});
