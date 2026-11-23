// Seasonal Sumo — Light and Dark from the stored `se.theme` (the key the website uses, so the kit
// needs no adapter), else the device's setting, on <html data-theme>; the old key carried over
// once. The canvas follows the shown theme (followTheme); the viewer's pill is bindLookSwitch.

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
