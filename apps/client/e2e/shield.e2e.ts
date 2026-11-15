// Seasonal Spirits — the shield against the staged shield (SCENARIO=shield, port 5936): the
// joining player stands in its own shrine with 6 coins of the season, beside a standing
// opponent that carries only swapped coins. That opponent shows the shield and the Steal
// button stays dimmed (nothing a steal could take); after the player's swap (key 2) the
// player's own ghost shows the shield. Desktop size; screenshot desktop-shield.png.

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { SCREENS, SHIELD_CLIENT_PORT, view } from './stack.js';

test('swapped coins show a shield, and Steal stays dimmed against them', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'checked at desktop size');
  await page.goto(`http://localhost:${SHIELD_CLIENT_PORT}/`);
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  const shielded = async (own: boolean): Promise<boolean> => {
    const v = await view(page);
    return v.ghostsShown.some((g) => g.shielded && (g.id === v.ghost) === own);
  };

  await expect.poll(() => shielded(false), { timeout: 5_000 }).toBe(true);
  await expect(page.locator('#steal')).not.toHaveClass(/\blit\b/);
  expect(await shielded(true)).toBe(false);

  await page.keyboard.press('Digit2'); // Swap: 6 coins of the season become 9 of the next
  await expect.poll(() => shielded(true), { timeout: 5_000 }).toBe(true);
  await page.screenshot({ path: path.join(SCREENS, 'desktop-shield.png') });
});
