// Seasonal Spirits — what the client specs share: the stack's ports, the client's exposed state
// and steering helpers for keyboard and touch. Touch goes through the browser's own input
// pipeline (Chrome DevTools Protocol), so the joystick sees real pointer events.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, shrinePositions } from '@seasonal-spirits/game-core';
import type { CDPSession, Page } from '@playwright/test';
import type { Rect } from '@seasonal-spirits/render';

export const SERVER_PORT = 3932;
export const CLIENT_PORT = 5932;
// A second stack with the staged steal (SCENARIO=steal, apps/server/src/scenario.ts).
export const STEAL_SERVER_PORT = 3934;
export const STEAL_CLIENT_PORT = 5934;
// A third stack with the staged shield (SCENARIO=shield).
export const SHIELD_SERVER_PORT = 3936;
export const SHIELD_CLIENT_PORT = 5936;
// The latency measurement's own stack (latency.config.ts): default seasons, no scenario.
export const LATENCY_SERVER_PORT = 3938;
export const LATENCY_CLIENT_PORT = 5938;

// localStorage of a browser that has seen the help overlay (apps/client/src/help.ts).
export const HELP_SEEN = (
  port: number,
): {
  origin: string;
  localStorage: { name: string; value: string }[];
} => ({
  origin: `http://localhost:${port}`,
  localStorage: [{ name: 'seasonal-spirits.help-seen', value: '1' }],
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SCREENS = path.join(ROOT, 'reports', 'screens', 'latest');
export const LATENCY_OUT = path.join(ROOT, 'reports', 'response', 'latency-latest.json');

// window.__client, written by apps/client/src/main.ts every frame.
export interface ClientView {
  // The frame's time and the server moments it shows (main.ts FrameTiming).
  timing: {
    frameMs: number;
    targetMs: number | null;
    latestMs: number | null;
    coinsMs: number | null;
  };
  mode: string;
  ghost: number | null;
  team: number | null;
  own: { x: number; y: number; carried: number } | null;
  season: number | null;
  coins: number;
  halvings: number;
  countdown: { ms: number; toEnd: boolean } | null; // the clock's countdown (main.ts)
  result: boolean;
  // What the frame drew (apps/client/src/scene.ts, Drawn).
  view: 'near' | 'overview' | 'spectator';
  barBottom: number;
  minimap: Rect | null;
  arrow: boolean;
  shrineOnScreen: boolean;
  arrowAt: { x: number; y: number } | null;
  shrineLabel: Rect | null;
  shrineLabels: Rect[];
  shrineLabelsOnGhost: Rect[];
  controls: Rect[];
  zones: Rect[];
  labels: { id: number; text: string; x: number; y: number; width: number; own: boolean }[];
  ghostsShown: {
    id: number;
    carried: number;
    x: number;
    y: number;
    r: number;
    shielded: boolean;
  }[];
  stealRing: boolean;
  signals: { ghost: number; signal: string }[]; // team signal markers drawn (signals.ts)
}

// Waits for the client's first frame: right after a (re)load window.__client does not exist
// yet (a reload in readability.e2e.ts read it too early in CI once).
export async function view(page: Page): Promise<ClientView> {
  const handle = await page.waitForFunction(
    () => (window as unknown as { __client?: ClientView }).__client,
  );
  return (await handle.jsonValue()) as ClientView;
}

export function ownShrine(team: number): { x: number; y: number } {
  const p = shrinePositions(DEFAULT_CONFIG)[team];
  if (!p) throw new Error(`no shrine for team ${team}`);
  return p;
}

export interface Steering {
  // Hold a direction (each component -1, 0 or 1) until the next call; (0, 0) releases.
  hold: (dx: number, dy: number) => Promise<void>;
}

const KEYS = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' } as const;

export function keyboard(page: Page): Steering {
  const held = new Set<string>();
  return {
    hold: async (dx, dy) => {
      const want = new Set<string>();
      if (dx < 0) want.add(KEYS.left);
      if (dx > 0) want.add(KEYS.right);
      if (dy < 0) want.add(KEYS.up);
      if (dy > 0) want.add(KEYS.down);
      for (const k of held) if (!want.has(k)) await page.keyboard.up(k);
      for (const k of want) if (!held.has(k)) await page.keyboard.down(k);
      held.clear();
      for (const k of want) held.add(k);
    },
  };
}

// A thumb on the joystick area: down once, then moves; (0, 0) lifts it.
export async function joystick(page: Page): Promise<Steering> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const box = await page.locator('#stick').boundingBox();
  if (!box) throw new Error('the joystick area is not visible');
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let down = false;
  type TouchType = 'touchStart' | 'touchMove' | 'touchEnd';
  const touch = (type: TouchType, x: number, y: number): Promise<unknown> =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  return {
    hold: async (dx, dy) => {
      if (dx === 0 && dy === 0) {
        if (down) await touch('touchEnd', origin.x, origin.y);
        down = false;
        return;
      }
      if (!down) await touch('touchStart', origin.x, origin.y);
      down = true;
      const len = Math.hypot(dx, dy);
      await touch('touchMove', origin.x + (dx / len) * 80, origin.y + (dy / len) * 80);
    },
  };
}

// Until the drawn own ghost has not moved for three polls in a row (at most 2 s).
async function standStill(page: Page): Promise<void> {
  let last = (await view(page)).own;
  let still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    await page.waitForTimeout(50);
    const now = (await view(page)).own;
    still = now && last && Math.hypot(now.x - last.x, now.y - last.y) < 0.5 ? still + 1 : 0;
    last = now;
  }
}

// `count` movement key presses of 400 ms, each from standing, towards the middle of the field
// (latency.ts reads them); returns the page time the first one may start from.
export async function pressFromStanding(
  page: Page,
  keys: Steering,
  count: number,
): Promise<number> {
  const from = await page.evaluate(() => performance.now());
  for (let i = 0; i < count; i++) {
    await standStill(page);
    const own = (await view(page)).own ?? { x: 1000, y: 1000 };
    const horizontal = i % 2 === 0;
    const sign = (horizontal ? own.x : own.y) < 1000 ? 1 : -1;
    await keys.hold(horizontal ? sign : 0, horizontal ? 0 : sign);
    await page.waitForTimeout(400);
    await keys.hold(0, 0);
  }
  return from;
}

// Steer the own ghost until `done` holds or the time runs out; true if it held.
export async function steerTo(
  page: Page,
  steering: Steering,
  target: { x: number; y: number },
  done: () => Promise<boolean>,
): Promise<boolean> {
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (await done()) {
      await steering.hold(0, 0);
      return true;
    }
    const own = (await view(page)).own;
    if (own) {
      const dx = target.x - own.x;
      const dy = target.y - own.y;
      await steering.hold(
        Math.abs(dx) > 25 ? Math.sign(dx) : 0,
        Math.abs(dy) > 25 ? Math.sign(dy) : 0,
      );
    }
    await page.waitForTimeout(100);
  }
  await steering.hold(0, 0);
  return false;
}
