// Seasonal Sumo — the Light/Dark switch of the Sky Island look (2026-11-18, piece 3): a small
// pill at the top right of the client and the viewer. It switches the canvas palette
// (palette.ts useLook) and the page's colours (the `dark` class on the body, index.html), and
// remembers the choice (storage.ts); Light by default.

import { useLook } from './palette.js';
import { readSetting, writeSetting } from './storage.js';

const KEY = 'seasonal-spirits.look';

export function bindLookSwitch(button: HTMLButtonElement): void {
  const show = (dark: boolean): void => {
    useLook(dark);
    document.body.classList.toggle('dark', dark);
    button.setAttribute('aria-pressed', String(dark));
  };
  let dark = readSetting(KEY) === 'dark';
  show(dark);
  button.addEventListener('click', () => {
    dark = !dark;
    writeSetting(KEY, dark ? 'dark' : 'light');
    show(dark);
    button.blur(); // Space stays the dash, never a second click on the switch
  });
}
