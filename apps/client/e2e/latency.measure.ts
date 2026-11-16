// Seasonal Spirits — `pnpm latency`: the delays of the real client on a local stack (session
// 2026-11-16-RESPONSE). Plays one desktop client: collects coins for a while (own pickups),
// then presses a movement key 55 times from standing; records everything (recorder.ts),
// prints the summary (latency.ts) and writes it to reports/response/latency-latest.json.
// A measurement, not a test: run on demand, never in `pnpm e2e`.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from '@playwright/test';
import { decodeState } from '@seasonal-spirits/protocol';
import { Analysis, summarise } from './latency.js';
import { installRecorder, latestBytes, readRecording } from './recorder.js';
import { LATENCY_OUT as OUT, keyboard, pressFromStanding, view } from './stack.js';

const COLLECT_MS = 90_000; // 40 s gave only 6 own pickups, 60 s 2 to 14 (2026-11-16)
const PRESSES = 55; // a few more than the 50 samples, for presses lost to a push

// CPU busy share of all cores between two os.cpus() readings: the background load.
function busy(a: os.CpuInfo[], b: os.CpuInfo[]): number {
  let used = 0;
  let all = 0;
  b.forEach((c, i) => {
    const p = a[i]?.times ?? c.times;
    const d = (k: keyof os.CpuInfo['times']): number => c.times[k] - p[k];
    used += d('user') + d('nice') + d('sys') + d('irq');
    all += d('user') + d('nice') + d('sys') + d('irq') + d('idle');
  });
  return all > 0 ? used / all : 0;
}

test('latency of the own ghost and of the coins', async ({ page }) => {
  test.setTimeout(300_000);
  await installRecorder(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __client?: { own: unknown } }).__client?.own,
  );
  const ownId = (await view(page)).ghost ?? -1;
  const cpuStart = os.cpus();
  const keys = keyboard(page);

  // Collect: steer at the nearest coin of the newest state, in the eight key directions.
  const until = Date.now() + COLLECT_MS;
  while (Date.now() < until) {
    const bytes = await latestBytes(page);
    const s = bytes && decodeState(new Uint8Array(bytes));
    const me = s?.ghosts.find((g) => g.id === ownId);
    const dist = (c: { x: number; y: number }): number =>
      me ? Math.hypot(c.x - me.x, c.y - me.y) : 0;
    const near = me && s?.coins.sort((p, q) => dist(p) - dist(q))[0];
    if (me && near) {
      const dx = near.x - me.x;
      const dy = near.y - me.y;
      await keys.hold(Math.abs(dx) > 8 ? Math.sign(dx) : 0, Math.abs(dy) > 8 ? Math.sign(dy) : 0);
    }
    await page.waitForTimeout(50);
  }
  await keys.hold(0, 0);

  const pressesFrom = await pressFromStanding(page, keys, PRESSES);
  const load = busy(cpuStart, os.cpus());

  const an = new Analysis(await readRecording(page), ownId);
  const summary = { cpuBusy: load, cores: os.cpus().length, ...summarise(an, pressesFrom) };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(summary, null, 1)}\n`);
  console.log(JSON.stringify(summary, null, 1));
});
