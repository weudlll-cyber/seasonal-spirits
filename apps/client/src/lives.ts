// Seasonal Sumo — the own lives in the band, sumo only: a circle per life, a lost one white (past
// MAX_HEARTS one and the number), and the line for a ghost out of lives.

import type { ServerState } from '@seasonal-spirits/protocol';
import { modeOf } from '@seasonal-spirits/render';
import { el } from './hud.js';

// Short enough for a 390 px phone next to the hearts (p20, 2026-11-19: the longer one was cut).
export const OUT_LINE = 'Out — watching';
const MAX_HEARTS = 5; // up to this many lives one each; more: one and "×7"

// The band's hearts: one per life, a lost one false — or, past MAX_HEARTS, one heart (false
// when none is left) and the count left.
export function heartsShown(hearts: boolean[]): { each: boolean[]; count: number | null } {
  if (hearts.length <= MAX_HEARTS) return { each: hearts, count: null };
  const left = hearts.filter(Boolean).length;
  return { each: [left > 0], count: left };
}

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
  private readonly count = document.createElement('span');
  private hearts: HTMLElement[] = [];

  // Every frame: the hearts are made once per count (a new match), then only fade (CSS).
  update(hearts: boolean[] | null): void {
    this.root.hidden = hearts === null;
    if (!hearts) return;
    const { each, count } = heartsShown(hearts);
    if (each.length !== this.hearts.length) {
      this.hearts = each.map(() => {
        const heart = document.createElement('span');
        heart.className = 'heart';
        return heart;
      });
      this.root.replaceChildren(...this.hearts, this.count);
    }
    this.hearts.forEach((heart, i) => heart.classList.toggle('lost', each[i] !== true));
    this.count.textContent = count === null ? '' : `×${String(count)}`;
    const left = hearts.filter(Boolean).length;
    this.root.setAttribute('aria-label', `${String(left)} ${left === 1 ? 'life' : 'lives'} left`);
  }
}
