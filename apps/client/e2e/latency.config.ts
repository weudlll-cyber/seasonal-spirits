// Seasonal Spirits — Playwright for `pnpm latency` only (latency.measure.ts): its own stack on
// 3938/5938 with the default match (5 minutes, no scenario), one desktop browser.
// Kept apart from playwright.config.ts so `pnpm e2e` never runs the measurement.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { HELP_SEEN, LATENCY_CLIENT_PORT, LATENCY_SERVER_PORT } from './stack.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export default defineConfig({
  testDir: '.',
  testMatch: '*.measure.ts',
  outputDir: path.join(ROOT, 'test-results'),
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    baseURL: `http://localhost:${LATENCY_CLIENT_PORT}`,
    storageState: { cookies: [], origins: [HELP_SEEN(LATENCY_CLIENT_PORT)] },
  },
  webServer: [
    {
      command: 'pnpm --filter @seasonal-spirits/server start',
      cwd: ROOT,
      url: `http://127.0.0.1:${LATENCY_SERVER_PORT}/metrics-lite`,
      env: { PORT: String(LATENCY_SERVER_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @seasonal-spirits/client start',
      cwd: ROOT,
      url: `http://localhost:${LATENCY_CLIENT_PORT}`,
      env: {
        CLIENT_PORT: String(LATENCY_CLIENT_PORT),
        SERVER_PORT: String(LATENCY_SERVER_PORT),
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
