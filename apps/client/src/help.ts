// Seasonal Sumo — the help overlay (owner's observation 2026-11-15: the rules were not
// understood): the mode's three short rules in plain words and the jump (JUMP 2026-11-17), each
// with a small drawing made in code (help-drawings.ts); in sumo the variant's rule in one sentence (LIVES 2026-11-17); "What you see": every
// mark on the field, as the game draws it (LEGEND); the controls; and the game's source (AGPL). Shown once on the first
// visit, any time with "?" or the band's "?" button. The card scrolls with a finger, the mouse
// wheel or the scroll keys (help-keys.ts, DECISIONS D3); the "×" at its top right, a tap outside
// it, Esc or any other key closes it (owner 2026-11-20: on a phone every touch closed it, so its
// end was out of reach). It opens with the focus on its "×". It follows the match on screen.
// While more of the card lies below its bottom edge a fade shows there, gone at the end (owner
// 2026-11-20: its last line was cut in half with no hint of more).

import type { GameMode } from '@seasonal-spirits/game-core';
import { STATE_LAST_STANDING } from '@seasonal-spirits/protocol';
import { LEGEND, readSetting, variantName, writeSetting } from '@seasonal-spirits/render';
import { CLIENT_CONFIG } from './config.js';
import { MARKER_DRAWINGS, RULES } from './help-drawings.js';
import { helpKey } from './help-keys.js';

const SEEN_KEY = 'seasonal-spirits.help-seen';
const SEEN =
  '<h3>What you see</h3><ol>' +
  LEGEND.map((l) => `<li>${MARKER_DRAWINGS[l.marker]}<span>${l.text}</span></li>`).join('') +
  '</ol>';

// The game's source under its licence (AGPL §13: every player of a running copy is offered it).
const SOURCE = `<p class="small">Free software under the AGPL: <a class="link" href="${CLIENT_CONFIG.sourceUrl}" target="_blank" rel="noopener noreferrer">Source (AGPL)</a></p>`;

const CONTROLS =
  '<p><b>Keyboard:</b> WASD or arrows to move, Space to dash, Shift to jump, ? help.</p>' +
  '<p><b>Touch:</b> left thumb anywhere on the left half to steer; Dash and Jump under the right thumb.</p>';

// Sumo's variant in one sentence, with the match's lives (a whole number from the decoded
// state); null in the walled modes.
export function variantRule(s: {
  mode: number;
  flags: number;
  livesAtStart: number;
}): string | null {
  if (variantName(s) === null) return null;
  const lives = `you have ${String(s.livesAtStart)} ${s.livesAtStart === 1 ? 'life' : 'lives'}`;
  return s.flags & STATE_LAST_STANDING
    ? `Last One Standing — no points: ${lives}, and the last ghost still in the arena wins for its team.`
    : `Points — every ghost you push off scores for your team; ${lives}, and the team with the most knockouts wins.`;
}

const content = (mode: GameMode, name: string, rule: string | null): string =>
  `<div class="card"><button class="close" type="button" aria-label="Close help">×</button>` +
  `<h2>How to play: ${name}</h2>${rule ? `<p>${rule}</p>` : ''}<ol>` +
  RULES[mode].map((r) => `<li>${r.drawing}<span>${r.text}</span></li>`).join('') +
  `</ol>${SEEN}${CONTROLS}${SOURCE}<p class="small">Scroll for more: a finger, the wheel, or the arrows, Page and Space keys. Close with ×, a tap outside the card, Esc or any other key.</p></div>`;

// Whether more of a scrolled box lies below what it shows (a pixel of rounding is none).
export function moreBelow(box: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  return box.scrollHeight - box.scrollTop - box.clientHeight > 1;
}

export class Help {
  private readonly overlay: HTMLElement;
  private shown: string | null = null; // the mode, name and rule on screen
  private before: Element | null = null; // focused before the card opened: it gets it back

  constructor(overlay: HTMLElement, button: HTMLButtonElement) {
    this.overlay = overlay;
    this.show('sumo', 'Seasonal Sumo', null);
    // Outside the card closes it; on the card a touch scrolls (and reaches no game control).
    overlay.addEventListener('pointerdown', (e) => {
      if (e.target !== overlay) return;
      e.preventDefault();
      this.close();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('.close')) this.close();
    });
    button.addEventListener('click', () => {
      this.open();
    });
    // Capture phase: while open, a key only scrolls or closes the help (help-keys.ts) and
    // reaches no game control.
    window.addEventListener(
      'keydown',
      (e) => {
        if (!overlay.hidden) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.key(e);
        } else if (e.key === '?') this.open();
      },
      { capture: true },
    );
    // Scrolling the card (its scroll does not bubble: caught on the way down) and a new size.
    const hint = (): void => {
      this.hint();
    };
    overlay.addEventListener('scroll', hint, { capture: true });
    window.addEventListener('resize', hint);
    if (readSetting(SEEN_KEY) !== '1') this.open();
  }

  // The rules of the match on screen; rebuilt only when they change (the server's rotation,
  // sumo's variants in turn, the lives).
  show(mode: GameMode, name: string, rule: string | null): void {
    const key = `${mode}|${name}|${rule ?? ''}`;
    if (key === this.shown) return;
    this.shown = key;
    // A rebuild while open replaces the focused "×": the new one takes the focus.
    const focused = this.overlay.contains(document.activeElement);
    this.overlay.innerHTML = content(mode, name, rule);
    if (focused) this.focusClose();
    this.hint();
  }

  // Opens the card with the focus on its "×", so a keyboard or screen reader starts in it.
  open(): void {
    this.before = document.activeElement;
    this.overlay.hidden = false;
    this.focusClose();
    this.hint();
  }

  private focusClose(): void {
    this.overlay.querySelector<HTMLElement>('.close')?.focus({ preventScroll: true });
  }

  private key(e: KeyboardEvent): void {
    const card = this.overlay.firstElementChild;
    const what = card instanceof HTMLElement ? helpKey(e, card) : 'close';
    if (what === 'close') this.close();
    else if (what !== 'stay' && card) card.scrollTop = what.scrollTo;
  }

  // The fade at the card's bottom edge while more follows (styles/controls.css `#help .card.more`).
  private hint(): void {
    const card = this.overlay.firstElementChild;
    if (card instanceof HTMLElement) card.classList.toggle('more', moreBelow(card));
  }

  private close(): void {
    this.overlay.hidden = true;
    writeSetting(SEEN_KEY, '1');
    if (this.before instanceof HTMLElement) this.before.focus({ preventScroll: true });
  }
}
