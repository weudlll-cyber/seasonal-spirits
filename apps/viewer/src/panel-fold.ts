// Seasonal Sumo — the viewer's admin panel folds to a small tab and remembers it across reloads
// (render storage.ts); its own file so admin-panel.ts stays one concern.

import { readSetting, writeSetting } from '@seasonal-spirits/render';

const KEY = 'seasonal-spirits.admin-folded';

// A fold button at the top of the panel `root`: folded, only the button shows (index.html
// #tuning.folded).
export function foldable(root: HTMLElement): void {
  const fold = document.createElement('button');
  fold.type = 'button';
  fold.className = 'fold';
  const set = (folded: boolean): void => {
    root.classList.toggle('folded', folded);
    fold.textContent = folded ? '◂ Admin' : 'Hide ▸';
    fold.setAttribute('aria-expanded', String(!folded));
    writeSetting(KEY, folded ? '1' : '0');
  };
  fold.addEventListener('click', () => {
    set(!root.classList.contains('folded'));
  });
  root.prepend(fold);
  set(readSetting(KEY) === '1');
}
