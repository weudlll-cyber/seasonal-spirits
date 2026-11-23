// Seasonal Spirits — `pnpm --filter @seasonal-spirits/viewer build:check`: builds the viewer into
// a temporary folder and fails if the build carries the admin panel (audit 2026-11-22 I1: a
// deployed viewer must not ship the panel's code; vite.config.ts `__ADMIN_PANEL__`). Run in CI.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viewer-build-'));
// The panel's two tab names (admin-panel.ts): text a build without the panel cannot contain.
const PANEL_TEXTS = ['Next match', 'Running match'];

try {
  await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } });
  const assets = path.join(outDir, 'assets');
  const code = fs
    .readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(assets, f), 'utf8'))
    .join('\n');
  const found = PANEL_TEXTS.filter((t) => code.includes(t));
  if (found.length > 0) {
    console.error(`viewer build carries the admin panel: ${found.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('viewer build: no admin panel');
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
