// Seasonal Sumo — the own lives in the band (LIVES 2026-11-17): a heart per life the match began
// with, a lost one fading out, and the line for a player whose ghost is out of lives. Only the
// own ghost's, and only in sumo: inside the walls of hill and bomb nobody falls.

import type { ServerState } from '@seasonal-spirits/protocol';
import { modeOf } from '@seasonal-spirits/render';
import { el } from './hud.js';

export const OUT_LINE = 'You are out — watching';

// The own ghost's hearts: true for a life left, false for a lost one; null without an own ghost
// in the state (watching) or outside sumo.
export function heartsOf(s: ServerState | undefined, ownId: number | null): boolean[] | null {
  const own = s?.ghosts.find((g) => g.id === ownId);
  if (!s || !own || modeOf(s.mode) !== 'sumo') return null;
  const of = Math.max(s.livesAtStart, own.lives);
  return Array.from({ length: of }, (_, i) => i < own.lives);
}

// The own ghost has lost its last life: it watches until the next match.
export function ownOut(s: ServerState | undefined, ownId: number | null): boolean {
  const hearts = heartsOf(s, ownId);
  return hearts !== null && !hearts.includes(true);
}

export class Hearts {
  private readonly root = el('hearts');
  private hearts: HTMLElement[] = [];

  // Every frame: the hearts are made once per count (a new match), then only fade (CSS).
  update(hearts: boolean[] | null): void {
    this.root.hidden = hearts === null;
    if (!hearts) return;
    if (hearts.length !== this.hearts.length) {
      this.hearts = hearts.map(() => {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.textContent = '♥';
        return heart;
      });
      this.root.replaceChildren(...this.hearts);
    }
    this.hearts.forEach((heart, i) => heart.classList.toggle('lost', hearts[i] !== true));
    const left = hearts.filter(Boolean).length;
    this.root.setAttribute('aria-label', `${String(left)} ${left === 1 ? 'life' : 'lives'} left`);
  }
}
