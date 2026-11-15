// Seasonal Spirits — Playwright: the player client against its own short-match server.
// Starts the run's own stack, never the developer's `pnpm dev` (3930/5930/5931): the match
// server on 3932 with 15 s seasons (a whole match in 60 s) and the client on 5932, then plays
// it in Chromium at a desktop size and at a phone size with touch.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import {
  CLIENT_PORT,
  HELP_SEEN,
  SERVER_PORT,
  STEAL_CLIENT_PORT,
  STEAL_SERVER_PORT,
} from './stack.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CI = process.env.CI !== undefined;

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
    storageState: { cookies: [], origins: [HELP_SEEN(CLIENT_PORT), HELP_SEEN(STEAL_CLIENT_PORT)] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @seasonal-spirits/server start',
      cwd: ROOT,
      url: `http://127.0.0.1:${SERVER_PORT}/metrics-lite`,
      env: { PORT: String(SERVER_PORT), SEASON_SECONDS: '15', RESULT_SECONDS: '5' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @seasonal-spirits/client start',
      cwd: ROOT,
      url: `http://localhost:${CLIENT_PORT}`,
      env: { CLIENT_PORT: String(CLIENT_PORT), SERVER_PORT: String(SERVER_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    // The staged steal (feedback.e2e.ts): every joining player beside an opponent hunter.
    {
      command: 'pnpm --filter @seasonal-spirits/server start',
      cwd: ROOT,
      url: `http://127.0.0.1:${STEAL_SERVER_PORT}/metrics-lite`,
      env: { PORT: String(STEAL_SERVER_PORT), SCENARIO: 'steal' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @seasonal-spirits/client start',
      cwd: ROOT,
      url: `http://localhost:${STEAL_CLIENT_PORT}`,
      env: { CLIENT_PORT: String(STEAL_CLIENT_PORT), SERVER_PORT: String(STEAL_SERVER_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
