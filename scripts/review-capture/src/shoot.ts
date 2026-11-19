// Seasonal Sumo review capture — one moment on every page watching the match: each page shot as
// it is, then switched to the other look with its own Light/Dark button, shot again and switched
// back, all pages at once so a moment takes well under a second. Files:
// reports/screens/review/<mode>/<size>-<look>-<role>-<nn>-<moment>.png, and per shot one line of
// what was measured on the page (metrics.ts) in that folder's metrics.jsonl.

import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { measurePage } from './metrics.js';
import { ROOT } from './stack.js';

export const REVIEW_DIR = path.join(ROOT, 'reports', 'screens', 'review');
const SWITCH_MS = 250; // the new look drawn at least once (its sky layers are cached per look)

export type Role = 'player' | 'spectator' | 'viewer';

export interface Watcher {
  page: Page;
  size: 'desktop' | 'phone' | 'big';
  role: Role;
}

const isDark = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.getElementById('look')?.getAttribute('aria-pressed') === 'true');

const toggle = (page: Page): Promise<void> =>
  page.evaluate(() => {
    document.getElementById('look')?.click();
  });

export class Camera {
  private n = 0;
  private readonly dir: string;

  constructor(
    mode: string,
    private readonly watchers: readonly Watcher[],
  ) {
    this.dir = path.join(REVIEW_DIR, mode);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  // `moment` on the pages of `roles` (all when absent), in both looks.
  async shoot(moment: string, roles?: readonly Role[]): Promise<void> {
    const on = this.watchers.filter((w) => !roles || roles.includes(w.role));
    if (on.length === 0) return; // e.g. the admin flow in a run without the viewer shown
    const nn = String(++this.n).padStart(2, '0');
    const once = async (w: Watcher, dark: boolean): Promise<void> => {
      const file = `${w.size}-${dark ? 'dark' : 'light'}-${w.role}-${nn}-${moment}.png`;
      await w.page.screenshot({ path: path.join(this.dir, file) });
      const m = await measurePage(w.page);
      fs.appendFileSync(
        path.join(this.dir, 'metrics.jsonl'),
        `${JSON.stringify({ file, ...m })}
`,
      );
    };
    const looks = await Promise.all(on.map((w) => isDark(w.page)));
    await Promise.all(on.map((w, i) => once(w, looks[i] ?? false)));
    await Promise.all(on.map((w) => toggle(w.page)));
    await on[0]?.page.waitForTimeout(SWITCH_MS);
    await Promise.all(on.map((w, i) => once(w, !(looks[i] ?? false))));
    await Promise.all(on.map((w) => toggle(w.page)));
    console.log(`  ${nn} ${moment} (${on.map((w) => `${w.size} ${w.role}`).join(', ')})`);
  }
}
