// Seasonal Sumo review capture — the browser pages watching a match on the review stack: the
// player's or a spectator's client at desktop (1280 × 800) or phone (390 × 844, touch) size, the
// help overlay counted as seen; the viewer (big screen, 1920 × 1080) with its admin panel; the
// panel's "Next match" flow: choose the game, its values shown, start it; waiting on a client for
// that match; and a game's folder name.

import type { Browser, Page } from '@playwright/test';
import { startableGame } from '@seasonal-spirits/game-core';
import { HELP_SEEN, type ClientView } from '../../../apps/client/e2e/stack.js';
import type { Camera } from './shoot.js';
import { PORTS } from './stack.js';

export const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
} as const;
export type Size = keyof typeof SIZES;

// tsx keeps function names with a helper (`__name`) that a function sent into the page by
// page.evaluate (metrics.ts) would call there; the page gets a stand-in.
const NAME_HELPER = 'window.__name = (f) => f;';

export async function openClient(browser: Browser, size: Size, spectate: boolean): Promise<Page> {
  const ctx = await browser.newContext({
    ...SIZES[size],
    storageState: { cookies: [], origins: [HELP_SEEN(PORTS.client)] },
  });
  await ctx.addInitScript(NAME_HELPER);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${String(PORTS.client)}/${spectate ? '?spectate=1' : ''}`);
  return page;
}

export async function openViewer(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(NAME_HELPER);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${String(PORTS.viewer)}/`);
  await page.locator('#tuning:not([hidden])').waitFor({ timeout: 30_000 });
  return page;
}

// The mode's folder name for a startable game: "Sumo · Last One Standing" → "sumo-last-one-standing".
export const slug = (game: string): string =>
  game
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');

// Until the client on `page` plays `game`'s match (its mode drawn, no result over it).
export async function waitForMatch(page: Page, game: string): Promise<void> {
  await page.waitForFunction(
    (m) => {
      const c = (window as unknown as { __client?: ClientView }).__client;
      return !!c && c.gameMode === m && !c.result;
    },
    startableGame(game)?.mode,
    { timeout: 30_000 },
  );
}

// The client's newest frame (apps/client/src/main.ts), null before the first one.
export const readClient = (page: Page): Promise<(ClientView & { out?: boolean }) | null> =>
  page.evaluate(
    () => (window as unknown as { __client?: ClientView & { out?: boolean } }).__client ?? null,
  );

// The admin panel folded or open (apps/viewer/src/panel-fold.ts).
export async function fold(viewer: Page, folded: boolean): Promise<void> {
  const is = await viewer.locator('#tuning.folded').count();
  if (is > 0 !== folded) await viewer.locator('#tuning button.fold').click();
}

// "Next match" → `game` → its values → "Start <game>"; shot on the viewer's page.
export async function startGame(viewer: Page, game: string, camera: Camera): Promise<void> {
  await fold(viewer, false);
  const panel = viewer.locator('#tuning');
  await panel.getByRole('button', { name: 'Next match', exact: true }).click();
  await panel.getByRole('button', { name: game, exact: true }).click();
  await camera.shoot('admin-choose', ['viewer']);
  await panel.getByRole('button', { name: `Start ${game}`, exact: true }).click();
  await viewer.waitForTimeout(1200);
  await camera.shoot('admin-started', ['viewer']);
}
