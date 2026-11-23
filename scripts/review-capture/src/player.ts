// Seasonal Sumo review capture — the one scripted player among 31 bots, playing as a person might
// per mode (or calm: to Sumo's middle, no dash), by keyboard or joystick (e2e stack.ts).

import type { GameMode } from '@seasonal-spirits/game-core';
import type { Page } from '@playwright/test';
import {
  joystick,
  keyboard,
  type ClientView,
  type Steering,
} from '../../../apps/client/e2e/stack.js';

const TICK_MS = 150;
const DASH_EVERY = 16; // ticks between dashes at most (2.4 s)
const JUMP_EVERY = 41; // ticks between jumps (about 6 s)
const NEAR = 4; // body radii: close enough to dash at

const press = (page: Page, id: 'dash' | 'jump'): Promise<void> =>
  page.locator(`#${id}`).dispatchEvent('pointerdown');

// Where the player heads, as a direction on screen (screen and field share their signs), and
// whether someone is close enough to dash at.
function aim(
  v: ClientView,
  mode: GameMode,
  { nowMs, calm }: { nowMs: number; calm: boolean },
): { dx: number; dy: number; near: boolean } {
  const me = v.ghostsShown.find((g) => g.id === v.ghost);
  const others = v.ghostsShown.filter((g) => g.id !== v.ghost);
  const nearest = me
    ? others.reduce<(typeof others)[number] | null>(
        (best, g) =>
          !best || Math.hypot(g.x - me.x, g.y - me.y) < Math.hypot(best.x - me.x, best.y - me.y)
            ? g
            : best,
        null,
      )
    : null;
  const near = !!(me && nearest && Math.hypot(nearest.x - me.x, nearest.y - me.y) < NEAR * me.r);
  if (mode === 'bomb' && me && nearest) return { dx: nearest.x - me.x, dy: nearest.y - me.y, near };
  const own = v.own;
  const area = v.area;
  if (!own || !area) return { dx: 0, dy: 0, near };
  const turn = mode === 'sumo' ? nowMs / 4000 : 0;
  const reach = mode === 'sumo' && !calm ? area.r * 0.45 : 0;
  const tx = area.x + Math.cos(turn) * reach;
  const ty = area.y + Math.sin(turn) * reach;
  return { dx: tx - own.x, dy: ty - own.y, near };
}

const axis = (d: number, dead: number): number => (Math.abs(d) > dead ? Math.sign(d) : 0);

// Plays until stopped; `read` gives the client's newest view (window.__client).
export async function startPlayer(
  page: Page,
  touch: boolean,
  read: () => ClientView | null,
  calm = false,
): Promise<{ stop: () => void }> {
  const steering: Steering = touch ? await joystick(page) : keyboard(page);
  let tick = 0;
  let lastDash = 0;
  let running = true;
  const loop = async (): Promise<void> => {
    while (running) {
      const v = read();
      tick++;
      if (v?.own && !v.result && v.gameMode) {
        const a = aim(v, v.gameMode, { nowMs: Date.now(), calm });
        await steering.hold(axis(a.dx, 20), axis(a.dy, 20));
        if (a.near && !calm && tick - lastDash > DASH_EVERY) {
          lastDash = tick;
          await press(page, 'dash');
        }
        if (tick % JUMP_EVERY === 0) await press(page, 'jump');
      } else await steering.hold(0, 0);
      await page.waitForTimeout(TICK_MS);
    }
  };
  const done = loop().catch(() => undefined); // a closed page ends it
  return {
    stop: () => {
      running = false;
      void done;
    },
  };
}
