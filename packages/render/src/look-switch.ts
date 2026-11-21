// Seasonal Sumo — Light and Dark from the player's own setting (owner decision 2026-11-21) on the
// kit's theme (@seasonal/kit): the stored choice `se.theme` — inside the website (same origin,
// /games/<slug>/) the one the player made on the website, standalone the one made in the game —,
// else the device's setting, followed live while nothing is stored, on <html data-theme>. The
// website stores the same key with the same values (seasonal-entertainment client/src/theme/
// theme.js THEME_KEY), so the kit needs no adapter. The game's own key before the kit is carried
// over once (`carryOverLook`). The canvas palette follows the theme the page shows (`followTheme`,
// palette.ts useLook): in the client the kit's own toggle sets it (frame/Frame.tsx), in the
// viewer, which has no React, its small pill at the top right (`bindLookSwitch`).

import {
  applyTheme,
  onShownThemeChange,
  onSystemThemeChange,
  resolveTheme,
  shownTheme,
  storeTheme,
  storedTheme,
  type Theme,
} from '@seasonal/kit';
import { useLook } from './palette.js';
import { readSetting, removeSetting } from './storage.js';

// The game's own key from 2026-11-18 until the kit's theme (night chain 2026-11-21).
const OLD_KEY = 'seasonal-spirits.look';

// Once: a choice under the old key becomes the kit's stored choice unless one is stored already
// (the website's or the game's own wins); the old key goes either way.
export function carryOverLook(): void {
  const old = readSetting(OLD_KEY);
  if (old === null) return;
  if (storedTheme() === null && (old === 'dark' || old === 'light')) storeTheme(old);
  removeSetting(OLD_KEY);
}

// The canvas palette in the theme <html data-theme> shows, now and on every change; Light while
// nothing has set it. Called before the kit's toggle mounts, so the carried choice holds there.
export function followTheme(): void {
  carryOverLook();
  const follow = (): void => {
    useLook(shownTheme() === 'dark');
  };
  follow();
  onShownThemeChange(follow);
}

export function bindLookSwitch(button: HTMLButtonElement): void {
  carryOverLook();
  let theme: Theme = resolveTheme();
  const show = (): void => {
    useLook(theme === 'dark');
    applyTheme(theme);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  show();
  onSystemThemeChange((t) => {
    theme = t;
    show();
  });
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    storeTheme(theme);
    show();
    button.blur(); // Space stays the dash, never a second click on the switch
  });
}
