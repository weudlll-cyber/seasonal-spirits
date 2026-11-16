// Seasonal Spirits — Playwright for `pnpm looks` only (looks.shoot.ts, session 2026-11-16-LOOK):
// the viewer's Vite on 5939 serving the picture page; no game server. Kept apart from
// playwright.config.ts so `pnpm e2e` never takes the pictures.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { LOOKS_VIEWER_PORT } from './stack.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export default defineConfig({
  testDir: '.',
  testMatch: '*.shoot.ts',
  outputDir: path.join(ROOT, 'test-results'),
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${LOOKS_VIEWER_PORT}` },
  webServer: {
    command: 'pnpm --filter @seasonal-spirits/viewer start',
    cwd: ROOT,
    url: `http://localhost:${LOOKS_VIEWER_PORT}/looks.html`,
    env: { VIEWER_PORT: String(LOOKS_VIEWER_PORT) },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
