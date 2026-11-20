// Seasonal Sumo review capture (`pnpm review:capture [sumo-points|sumo-last-one-standing|king-of-the-season|halving-bomb …]`, night
// 2026-11-19/20): every part of a match, as the owner and the planner review it before a test.
// On its own stack (stack.ts) each mode is started through the viewer's "Next match" flow and
// played to its end and into the next match twice: once with the scripted player (player.ts) on a
// desktop, a spectator on a phone and the viewer at 1920 × 1080, once with the player on a phone
// and a spectator on a desktop — every moment (moments.ts) in Light and Dark (shoot.ts); then
// the contact sheets (sheets.ts). Development only: it starts the dev admin endpoint.

import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { STARTABLE_GAMES } from '@seasonal-spirits/game-core';
import { chromium, type Browser, type Page } from '@playwright/test';
import { Director } from './moments.js';
import {
  fold,
  openClient,
  openViewer,
  readClient,
  slug,
  startGame,
  waitForMatch,
  type Size,
} from './pages.js';
import { startPlayer } from './player.js';
import { makeSheets } from './sheets.js';
import { Camera, REVIEW_DIR, type Watcher } from './shoot.js';
import { startStack } from './stack.js';

const MATCH_LIMIT_MS = 12 * 60_000; // a match that never ends (Last One Standing kept halving)
const POLL_MS = 100;

if (process.env.NODE_ENV === 'production') throw new Error('review-capture is development only');

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const games = STARTABLE_GAMES.filter((g) => wanted.length === 0 || wanted.includes(slug(g)));
  const stack = await startStack();
  const browser = await chromium.launch();
  try {
    for (const game of games) {
      fs.rmSync(path.join(REVIEW_DIR, slug(game)), { recursive: true, force: true });
      for (const size of ['desktop', 'phone'] as const) await run(browser, game, size);
    }
  } finally {
    await browser.close();
    stack.stop();
  }
  await makeSheets(games.map(slug));
}

// One match of `game` with the player on `size`.
async function run(browser: Browser, game: string, size: Size): Promise<void> {
  console.log(`${game}, player on the ${size}`);
  const other: Size = size === 'desktop' ? 'phone' : 'desktop';
  // The viewer first: the clients' start screen shows only for a moment after their page loads.
  const viewer = await openViewer(browser);
  const [player, spectator] = await Promise.all([
    openClient(browser, size, false),
    openClient(browser, other, true),
  ]);
  const watchers: Watcher[] = [
    { page: player, size, role: 'player' },
    { page: spectator, size: other, role: 'spectator' },
  ];
  if (size === 'desktop') watchers.push({ page: viewer, size: 'big', role: 'viewer' });
  const camera = new Camera(slug(game), watchers);
  await camera.shootStart(['player', 'spectator']);
  await startGame(viewer, game, camera);
  await waitForMatch(player, game);
  await player.waitForTimeout(2000);
  await camera.shoot('first-seconds');
  await extras(player, viewer, camera);
  await follow(player, size === 'phone', camera);
  for (const p of [player, spectator, viewer]) await p.context().close();
}

// The help overlay open, the sound switched off, the admin panel folded (after its open shots).
async function extras(player: Page, viewer: Page, camera: Camera): Promise<void> {
  await player.locator('#help-open').dispatchEvent('click');
  await player.waitForTimeout(400);
  await camera.shoot('help-open', ['player']);
  await player.keyboard.press('Escape'); // any key closes it
  await player.locator('#mute').dispatchEvent('click');
  await camera.shoot('sound-off', ['player']);
  await player.locator('#mute').dispatchEvent('click');
  await fold(viewer, true);
  await camera.shoot('panel-collapsed', ['viewer']);
}

// Plays and shoots until the next match's first seconds (or the limit).
async function follow(player: Page, touch: boolean, camera: Camera): Promise<void> {
  let latest: Awaited<ReturnType<typeof readClient>> = null;
  const director = new Director();
  const playing = await startPlayer(player, touch, () => latest);
  const until = Date.now() + MATCH_LIMIT_MS;
  while (!director.finished && Date.now() < until) {
    latest = await readClient(player).catch(() => latest);
    if (latest) director.observe(latest, Date.now());
    for (const shot of director.due(Date.now())) await camera.shoot(shot.moment, shot.roles);
    await delay(POLL_MS);
  }
  playing.stop();
  if (!director.finished) console.log('  the match did not end within the limit');
}

void main();
