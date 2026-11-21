// Seasonal Sumo — the client's frame cost (`pnpm frame-cost [runs]`, second night chain 2026-11-21,
// piece 6): the player's client with all 32 seats played (bots) on the review stack (stack.ts),
// at a desktop 1536 × 768 and a phone 390 × 844, `runs` short runs each (30 by default). A run is a
// fresh page, 2 s to settle, then 5 s measured: the main thread's task time per drawn frame
// (Chrome's own TaskDuration over the frames counted), so a build is measured without a line of
// it changed. Per run the PC's CPU load is recorded — before the run, with only the stack up, and
// during it. Prints a line per run and the median and 95th percentile per size, with N.

import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, type Browser } from '@playwright/test';
import { PORTS, startStack } from './stack.js';

const SIZES = {
  desktop: { width: 1536, height: 768 },
  phone: { width: 390, height: 844 },
} as const;
const SETTLE_MS = 2000;
const MEASURE_MS = 5000;
const LOAD_MS = 1000;
// Counts the frames the page draws; the help counted as seen, so it does not cover the field.
const FRAME_COUNTER = `localStorage.setItem('seasonal-spirits.help-seen', '1');
window.__frames = 0;
(function count() { window.__frames += 1; requestAnimationFrame(count); })();`;

if (process.env.NODE_ENV === 'production') throw new Error('frame-cost is development only');

// The whole PC's CPU busy share over `ms`, every core (os.cpus times).
async function cpuBusy(ms: number): Promise<number> {
  const sum = () =>
    os.cpus().reduce(
      (a, c) => {
        const t = c.times;
        return { idle: a.idle + t.idle, all: a.all + t.user + t.nice + t.sys + t.irq + t.idle };
      },
      { idle: 0, all: 0 },
    );
  const a = sum();
  await delay(ms);
  const b = sum();
  return 1 - (b.idle - a.idle) / Math.max(1, b.all - a.all);
}

interface Run {
  size: string;
  msPerFrame: number;
  frames: number;
  loadBefore: number;
  loadDuring: number;
}

async function run(browser: Browser, size: keyof typeof SIZES): Promise<Run> {
  const loadBefore = await cpuBusy(LOAD_MS);
  const ctx = await browser.newContext({ viewport: SIZES[size] });
  // Plain JavaScript, so tsx adds no helper the page lacks (pages.ts NAME_HELPER).
  await ctx.addInitScript(FRAME_COUNTER);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(`http://localhost:${String(PORTS.client)}/`);
  await page.waitForTimeout(SETTLE_MS);
  const task = async (): Promise<number> => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return metrics.find((m) => m.name === 'TaskDuration')?.value ?? 0;
  };
  const frames = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { __frames: number }).__frames);
  const [t0, f0] = [await task(), await frames()];
  const during = cpuBusy(MEASURE_MS);
  await page.waitForTimeout(MEASURE_MS);
  const [t1, f1] = [await task(), await frames()];
  await ctx.close();
  const n = f1 - f0;
  return {
    size,
    msPerFrame: ((t1 - t0) * 1000) / Math.max(1, n),
    frames: n,
    loadBefore,
    loadDuring: await during,
  };
}

const quantile = (xs: number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? NaN;
};

async function main(): Promise<void> {
  const runs = Number(process.argv[2] ?? 30);
  const stack = await startStack();
  const browser = await chromium.launch();
  const all: Run[] = [];
  try {
    await delay(3000); // the first match under way
    for (let i = 0; i < runs; i += 1) {
      for (const size of Object.keys(SIZES) as (keyof typeof SIZES)[]) {
        const r = await run(browser, size);
        all.push(r);
        console.log(JSON.stringify(r));
      }
    }
  } finally {
    await browser.close();
    stack.stop();
  }
  for (const size of Object.keys(SIZES)) {
    const ms = all.filter((r) => r.size === size).map((r) => r.msPerFrame);
    const load = all.filter((r) => r.size === size).map((r) => r.loadBefore);
    console.log(
      `${size}: N ${String(ms.length)}, median ${quantile(ms, 0.5).toFixed(2)} ms, p95 ` +
        `${quantile(ms, 0.95).toFixed(2)} ms per frame; load before median ` +
        `${(quantile(load, 0.5) * 100).toFixed(0)} %`,
    );
  }
}

void main();
