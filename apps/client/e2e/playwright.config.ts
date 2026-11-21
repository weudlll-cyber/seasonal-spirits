// Seasonal Spirits — Playwright: the player client against its own short-match servers.
// Starts the run's own stacks, never the developer's `pnpm dev` (3930/5930): Sumo on
// 3932/5932 — its client also serving /admin/, whose panel the panel spec drives — and King of the
// Season and Halving Bomb on 3933/5933 and 3934/5934, each with 15 s seasons (a whole match in
// 60 s), then plays them in Chromium at a desktop size and at a phone size with touch.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { CLIENT_PORT, HELP_SEEN, MODE_STACKS, SERVER_PORT } from './stack.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CI = process.env.CI !== undefined;
// The run's id, set once in the main process before any worker starts; the workers inherit it and
// load this file again, keeping it. A spec's screenshot folder is cleared once per run (stack.ts
// screenshotPath).
process.env.E2E_RUN ??= new Date().toISOString();

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.ts',
  outputDir: path.join(ROOT, 'test-results'),
  // A whole short match (60 s), its result and the margin for a joining client.
  timeout: 150_000,
  forbidOnly: CI,
  retries: 0,
  // One match server: the two sizes play one after the other.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'retain-on-failure',
    // The help overlay counts as seen, so it does not cover the field; help.e2e.ts starts
    // with an empty storage instead.
    storageState: { cookies: [], origins: [HELP_SEEN(CLIENT_PORT)] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    // Points with 9 lives (FIX 2026-11-17-4): the play spec waits for the last countdown, which a
    // match ended early by lives would never reach. The admin settings answer /admin/ on the
    // client's address (CLIENT_PORT, one address), its presets kept under test-results/.
    ...stack(SERVER_PORT, CLIENT_PORT, {
      GAME_MODE: 'sumo',
      SUMO_VARIANT: 'points',
      SUMO_LIVES: '9',
      // The result up 15 s: result-fit.e2e.ts reads it at four sizes, which did not fit 5 s on a
      // loaded PC (second night chain 2026-11-21, piece 4).
      RESULT_SECONDS: '15',
      DEV_TUNING: '1',
      CLIENT_PORT: String(CLIENT_PORT),
      PRESET_DIR: path.join(ROOT, 'test-results', 'presets'),
    }),
    ...stack(MODE_STACKS.hill.server, MODE_STACKS.hill.client, { GAME_MODE: 'hill' }),
    ...stack(MODE_STACKS.bomb.server, MODE_STACKS.bomb.client, { GAME_MODE: 'bomb' }),
  ],
});

// A match server with 15 s seasons and its client.
function stack(server: number, client: number, env: Record<string, string>) {
  return [
    {
      command: 'pnpm --filter @seasonal-spirits/server start',
      cwd: ROOT,
      url: `http://127.0.0.1:${String(server)}/metrics-lite`,
      env: { PORT: String(server), SEASON_SECONDS: '15', RESULT_SECONDS: '5', ...env },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @seasonal-spirits/client start',
      cwd: ROOT,
      url: `http://localhost:${String(client)}`,
      env: { CLIENT_PORT: String(client), SERVER_PORT: String(server) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ];
}
