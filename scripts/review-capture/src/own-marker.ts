// Seasonal Sumo review capture of the own marker (`pnpm review:own-marker [game …]`, owner
// 2026-11-20: is the own character found at a glance where it is densest?): on the review stack
// (stack.ts) Sumo · Points, King of the Season and Halving Bomb started one after the other
// through the viewer's "Next match" flow, each with two calm players (player.ts) in the same
// match — one on a desktop, one on a phone —, each shot in Light and Dark (shoot.ts) at the
// moments of own-moments.ts: the first seconds and every season's densest moment, so every
// season's ground shows. Named games alone (their folder names, e.g. `halving-bomb`) are shot
// again, the others' shots kept. Then one contact sheet of all, sheet-own-marker.png (sheets.ts).
// Development only: it starts the dev admin endpoint.

import { setTimeout as delay } from 'node:timers/promises';
import { chromium, type Browser, type Page } from '@playwright/test';
import { OwnDirector } from './own-moments.js';
import {
  openClient,
  openViewer,
  readClient,
  slug,
  startGame,
  waitForMatch,
  type Size,
} from './pages.js';
import { startPlayer } from './player.js';
import { makeFlowSheet } from './sheets.js';
import { Camera, REVIEW_DIR } from './shoot.js';
import { startStack } from './stack.js';
import { clearTopic } from './topics.js';

const GAMES = ['Sumo · Points', 'King of the Season', 'Halving Bomb'] as const;
const DIR = 'own-marker';
const MATCH_LIMIT_MS = 8 * 60_000;
const POLL_MS = 100;
const SIZES: readonly Size[] = ['desktop', 'phone'];

if (process.env.NODE_ENV === 'production') throw new Error('review-capture is development only');

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const games = GAMES.filter((g) => wanted.length === 0 || wanted.includes(slug(g)));
  // Only the latest run (topics.ts): all of it, or the named games shot again.
  clearTopic(REVIEW_DIR, DIR, wanted.length === 0 ? null : games.map(slug));
  const stack = await startStack();
  const browser = await chromium.launch();
  try {
    for (const game of games) await run(browser, game);
  } finally {
    await browser.close();
    stack.stop();
  }
  await makeFlowSheet(DIR);
}

// One match of `game` with a player on each size.
async function run(browser: Browser, game: string): Promise<void> {
  console.log(game);
  const viewer = await openViewer(browser);
  const players = await Promise.all(SIZES.map((size) => openClient(browser, size, false)));
  await startGame(viewer, game, new Camera(DIR, [])); // no viewer shots here
  await Promise.all(players.map((page, i) => follow(page, SIZES[i] ?? 'desktop', game)));
  for (const p of [viewer, ...players]) await p.context().close();
}

// Plays `game` on `page` and shoots its moments until every season is shot or the match is over.
async function follow(page: Page, size: Size, game: string): Promise<void> {
  await waitForMatch(page, game);
  const camera = new Camera(DIR, [{ page, size, role: 'player' }]);
  let latest: Awaited<ReturnType<typeof readClient>> = null;
  const director = new OwnDirector();
  const playing = await startPlayer(page, size === 'phone', () => latest, true);
  const until = Date.now() + MATCH_LIMIT_MS;
  while (!director.finished && Date.now() < until) {
    latest = await readClient(page).catch(() => latest);
    const moment = latest ? director.observe(latest, Date.now()) : null;
    if (moment) await camera.shoot(`${slug(game)}-${moment}`);
    await delay(POLL_MS);
  }
  playing.stop();
  if (!director.finished) console.log(`  ${size}: the match did not end within the limit`);
}

void main();
