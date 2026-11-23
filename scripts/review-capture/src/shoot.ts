// Seasonal Sumo review capture — one moment on every watching page, shot in both looks at once
// (the start screen right after a reload in each look), into reports/screens/review/<mode>/.

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
  page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');

const toggle = (page: Page): Promise<void> =>
  page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-testid="theme-toggle"], #look')?.click();
  });

// Whether the client's start screen shows whole: not hidden, not fading.
const startShown = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const s = document.getElementById('start');
    return !!s && !s.hidden && !s.classList.contains('gone');
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
    const on = this.on(roles);
    if (on.length === 0) return; // e.g. the admin flow in a run without the viewer shown
    const nn = this.next();
    const looks = await Promise.all(on.map((w) => isDark(w.page)));
    await Promise.all(on.map((w, i) => this.once(w, nn, moment, looks[i] ?? false)));
    await Promise.all(on.map((w) => toggle(w.page)));
    await on[0]?.page.waitForTimeout(SWITCH_MS);
    await Promise.all(on.map((w, i) => this.once(w, nn, moment, !(looks[i] ?? false))));
    await Promise.all(on.map((w) => toggle(w.page)));
    console.log(`  ${nn} ${moment} (${on.map((w) => `${w.size} ${w.role}`).join(', ')})`);
  }

  // The clients' start screen on the pages of `roles`, Light then Dark, each shot right after the
  // page is loaded again in that look (the look is remembered across the reload); Light after.
  async shootStart(roles: readonly Role[]): Promise<void> {
    const on = this.on(roles);
    const nn = this.next();
    for (const dark of [false, true]) {
      await Promise.all(
        on.map(async (w) => {
          if ((await isDark(w.page)) !== dark) await toggle(w.page);
          await w.page.reload();
          await w.page.waitForTimeout(SWITCH_MS / 2); // the island drawn once
          if (!(await startShown(w.page)))
            console.log(`  the start screen was gone before the shot (${w.size} ${w.role})`);
          await this.once(w, nn, 'start-screen', dark);
        }),
      );
    }
    await Promise.all(on.map((w) => toggle(w.page)));
    console.log(`  ${nn} start-screen (${on.map((w) => `${w.size} ${w.role}`).join(', ')})`);
  }

  private on(roles?: readonly Role[]): Watcher[] {
    return this.watchers.filter((w) => !roles || roles.includes(w.role));
  }

  private next(): string {
    return String(++this.n).padStart(2, '0');
  }

  // One page in its present look (`dark`), shot and measured.
  private async once(w: Watcher, nn: string, moment: string, dark: boolean): Promise<void> {
    const file = `${w.size}-${dark ? 'dark' : 'light'}-${w.role}-${nn}-${moment}.png`;
    await w.page.screenshot({ path: path.join(this.dir, file) });
    const m = await measurePage(w.page);
    fs.appendFileSync(
      path.join(this.dir, 'metrics.jsonl'),
      `${JSON.stringify({ file, ...m })}
`,
    );
  }
}
