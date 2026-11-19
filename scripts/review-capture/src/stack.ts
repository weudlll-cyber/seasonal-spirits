// Seasonal Sumo review capture — its own match server, client and viewer on ports of their own
// (never `pnpm dev`'s 3930/5930/5931 nor the browser specs'), with a fixed seed, every mode in the
// rotation and the admin endpoint for its viewer; stopped again, with their child processes, at
// the end. The same commands as the specs' stacks (apps/client/e2e/playwright.config.ts).

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const PORTS = { server: 3936, client: 5936, viewer: 5937 } as const;
export const SEED = 7; // the first match's seed; each started match takes the next

function start(pkg: string, env: Record<string, string>): ChildProcess {
  // One command line through the shell (pnpm is a .cmd on Windows); `pkg` is one of three names.
  return spawn(`pnpm --filter @seasonal-spirits/${pkg} start`, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    shell: true,
  });
}

async function up(url: string, timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    await delay(300);
  }
  throw new Error(`review-capture: ${url} did not answer within ${String(timeoutMs)} ms`);
}

export interface Stack {
  stop: () => void;
}

export async function startStack(): Promise<Stack> {
  const procs = [
    start('server', {
      PORT: String(PORTS.server),
      SEED: String(SEED),
      GAME_MODE: 'rotate',
      DEV_TUNING: '1',
      VIEWER_PORT: String(PORTS.viewer),
      PRESET_DIR: path.join(ROOT, 'test-results', 'review-presets'),
    }),
    start('client', { CLIENT_PORT: String(PORTS.client), SERVER_PORT: String(PORTS.server) }),
    start('viewer', { VIEWER_PORT: String(PORTS.viewer), PORT: String(PORTS.server) }),
  ];
  const stop = (): void => {
    for (const p of procs) {
      if (p.pid === undefined) continue;
      // The whole tree: pnpm, then node or vite under it.
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F']);
      else p.kill();
    }
  };
  try {
    await up(`http://127.0.0.1:${String(PORTS.server)}/metrics-lite`, 60_000);
    await up(`http://localhost:${String(PORTS.client)}`, 60_000);
    await up(`http://localhost:${String(PORTS.viewer)}`, 60_000);
  } catch (e) {
    stop();
    throw e;
  }
  return { stop };
}
