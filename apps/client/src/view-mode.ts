// Seasonal Spirits — the player's view mode (owner decision 2026-11-15): "Near" follows the own
// ghost, "Overview" fits the whole field. Each player chooses with the corner button or V;
// the game starts in "Near" and the choice is remembered in the browser.

import { readSetting, writeSetting } from './storage.js';

export type ViewMode = 'near' | 'overview';

const KEY = 'seasonal-spirits.view';
const LABELS: Record<ViewMode, string> = { near: 'View: Near', overview: 'View: Overview' };

export class ViewToggle {
  mode: ViewMode = readSetting(KEY) === 'overview' ? 'overview' : 'near';

  constructor(private readonly button: HTMLButtonElement) {
    this.show();
    button.addEventListener('click', () => {
      this.toggle();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggle();
    });
  }

  private toggle(): void {
    this.mode = this.mode === 'near' ? 'overview' : 'near';
    writeSetting(KEY, this.mode);
    this.show();
  }

  private show(): void {
    this.button.textContent = LABELS[this.mode];
    this.button.setAttribute('aria-label', `${LABELS[this.mode]} (V to switch)`);
  }
}
