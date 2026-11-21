// Seasonal Sumo — the Light/Dark switch: the kit's theme on Sumo's small pill at the band's corner
// (client) and the viewer's top right. The kit decides (@seasonal/kit theme): the website's stored
// choice (`se.theme`, one choice for the site and every game on its origin), else the system
// setting, followed live while nothing is stored, on <html data-theme>. The pill switches it, and
// with it the canvas palette (palette.ts useLook) and the pages' colours (index.html).

import {
  applyTheme,
  onSystemThemeChange,
  resolveTheme,
  storeTheme,
  type Theme,
} from '@seasonal/kit';
import { useLook } from './palette.js';

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
