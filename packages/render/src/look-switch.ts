// Seasonal Sumo — Light and Dark on the kit's theme (@seasonal/kit): the website's stored choice
// (`se.theme`, one choice for the site and every game on its origin), else the system setting,
// followed live while nothing is stored, on <html data-theme>. The canvas palette follows the
// theme the page shows (`followTheme`, palette.ts useLook): in the client the kit's own toggle
// sets it (frame/Frame.tsx), in the viewer, which has no React, its small pill at the top right
// (`bindLookSwitch`).

import {
  applyTheme,
  onShownThemeChange,
  onSystemThemeChange,
  resolveTheme,
  shownTheme,
  storeTheme,
  type Theme,
} from '@seasonal/kit';
import { useLook } from './palette.js';

// The canvas palette in the theme <html data-theme> shows, now and on every change; Light while
// nothing has set it.
export function followTheme(): void {
  const follow = (): void => {
    useLook(shownTheme() === 'dark');
  };
  follow();
  onShownThemeChange(follow);
}

export function bindLookSwitch(button: HTMLButtonElement): void {
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
