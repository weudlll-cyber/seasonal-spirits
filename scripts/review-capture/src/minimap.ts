// Seasonal Sumo review capture of the phone's minimap (`pnpm review:minimap [game …]`, owner
// 2026-11-20: does it show the field's edge, the screen's frame, King's zone or Bomb's carriers and
// the own dot?): on the review stack (stack.ts) King of the Season and Halving Bomb started one
// after the other through the viewer's "Next match" flow, each with one calm player (player.ts) on a
// portrait phone, shot in Light and Dark (shoot.ts) at the moments of minimap-moments.ts: the
// start, after each halving, the last seconds. Where the map and the band's bottom stood at each
// moment go to the folder's minimap.jsonl; then one sheet, sheet-minimap.png, of every shot with
// its map enlarged (sheets.ts). Named games alone (their folder names) are shot again, the others' shots kept.
// Development only: it starts the dev admin endpoint.

import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, type Browser, type Page } from '@playwright/test';
import { MinimapDirector } from './minimap-moments.js';
import { openClient, openViewer, readClient, slug, startGame, waitForMatch } from './pages.js';
import { startPlayer } from './player.js';
import { MAPS_FILE, makeMinimapSheet } from './sheets.js';
import { Camera, REVIEW_DIR } from './shoot.js';
import { startStack } from './stack.js';
import { clearTopic } from './topics.js';

const GAMES = ['King of the Season', 'Halving Bomb'] as const;
const DIR = 'minimap';
const MATCH_LIMIT_MS = 8 * 60_000;
const POLL_MS = 100;

if (process.env.NODE_ENV === 'production') throw new Error('review-capture is development only');

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const games = GAMES.filter((g) => wanted.length === 0 || wanted.includes(slug(g)));
  // Only the latest run (topics.ts): all of it, or the named games shot again.
  clearTopic(REVIEW_DIR, DIR, wanted.length === 0 ? null : games.map(slug));
  const maps = path.join(REVIEW_DIR, DIR, MAPS_FILE);
  const kept = fs.existsSync(maps) ? fs.readFileSync(maps, 'utf8').split('\n') : [];
  const others = kept.filter((l) => l && !games.some((g) => l.includes(`-${slug(g)}-`)));
  fs.writeFileSync(maps, others.map((l) => `${l}\n`).join(''));
  const stack = await startStack();
  const browser = await chromium.launch();
  try {
    for (const game of games) await run(browser, game, maps);
  } finally {
    await browser.close();
    stack.stop();
  }
  await makeMinimapSheet(DIR);
}

// One match of `game` with a player on a phone.
async function run(browser: Browser, game: string, maps: string): Promise<void> {
  console.log(game);
  const viewer = await openViewer(browser);
  const page = await openClient(browser, 'phone', false);
  await startGame(viewer, game, new Camera(DIR, [])); // no viewer shots here
  await follow(page, game, maps);
  for (const p of [viewer, page]) await p.context().close();
}

// Plays `game` on `page` and shoots its moments until the last seconds or the match's end.
async function follow(page: Page, game: string, maps: string): Promise<void> {
  await waitForMatch(page, game);
  const camera = new Camera(DIR, [{ page, size: 'phone', role: 'player' }]);
  let latest: Awaited<ReturnType<typeof readClient>> = null;
  const director = new MinimapDirector();
  const playing = await startPlayer(page, true, () => latest, true);
  const until = Date.now() + MATCH_LIMIT_MS;
  while (!director.finished && Date.now() < until) {
    const before = latest;
    latest = await readClient(page).catch(() => latest);
    if (latest && before && (latest.team !== before.team || latest.halvings !== before.halvings))
      console.log(`  team ${String(latest.team)}, halvings ${String(latest.halvings)}`);
    const moment = latest ? director.observe(latest, Date.now()) : null;
    if (moment && latest) {
      const name = `${slug(game)}-${moment}`;
      const { minimap, barBottom } = latest;
      fs.appendFileSync(maps, `${JSON.stringify({ moment: name, minimap, barBottom })}\n`);
      await camera.shoot(name);
    }
    await delay(POLL_MS);
  }
  playing.stop();
  if (!director.finished) console.log('  the match did not end within the limit');
}

void main();
