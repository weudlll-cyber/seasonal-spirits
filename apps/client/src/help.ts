// Seasonal Spirits — the help overlay (owner's observation 2026-11-15: stealing was not
// understood): the five rules of CONCEPT.md §2a in plain words, each with a small drawing
// made in code, and the controls. Shown once on the first visit, any time with "?" or the
// band's "?" button; one tap or any key closes it.

import { SEASON_COLOURS } from '@seasonal-spirits/render';
import { readSetting, writeSetting } from './storage.js';

const SEEN_KEY = 'seasonal-spirits.help-seen';
const [SPRING, SUMMER] = SEASON_COLOURS;
const GREY = '#8b98a5';

const diamond = (x: number, y: number, fill: string): string =>
  `<path d="M${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}L${x - 9} ${y}Z" fill="${fill}" stroke="#fff" stroke-width="1"/>`;
const ghost = (x: number, y: number, r: number, fill: string): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const label = (x: number, y: number, text: string): string =>
  `<text x="${x}" y="${y}" fill="#e6edf3" font-size="13" text-anchor="middle">${text}</text>`;
const svg = (body: string): string =>
  `<svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">${body}</svg>`;

// Static text and drawings only; nothing from the server or the player goes in here.
const RULES: { text: string; drawing: string }[] = [
  {
    text: 'Only the coins of the current season fall on the field. Walk over them to pick them up.',
    drawing: svg(diamond(30, 20, SPRING) + diamond(60, 38, SPRING) + diamond(90, 22, SPRING)),
  },
  {
    text: 'A coin is worth 1 in its own season and ½ in any other season.',
    drawing: svg(
      diamond(35, 25, SPRING) + label(35, 54, '1') + diamond(85, 25, GREY) + label(85, 54, '½'),
    ),
  },
  {
    text: 'At your shrine: Secure banks what you carry now. Swap turns 10 coins of this season into 15 of the next.',
    drawing: svg(
      `<circle cx="30" cy="30" r="24" fill="none" stroke="${SPRING}" stroke-width="3"/>` +
        label(30, 35, 'Bank') +
        label(88, 35, '10 → 15'),
    ),
  },
  {
    text: 'Every season change is a halving: coins of the old season are then worth half. Secure or swap before it.',
    drawing: svg(
      diamond(30, 28, SPRING) + label(60, 33, '→') + diamond(90, 28, GREY) + label(90, 56, '½'),
    ),
  },
  {
    text: 'Carrying makes you bigger, glowing and slower — and others can steal from you. Steal takes from the nearest opponent carrier in your range; the Steal button lights up when that works.',
    drawing: svg(
      `<circle cx="40" cy="30" r="27" fill="none" stroke="${GREY}" stroke-dasharray="3 3"/>` +
        ghost(40, 30, 9, SPRING) +
        ghost(72, 30, 14, SUMMER),
    ),
  },
];

const CONTROLS =
  '<p><b>Keyboard:</b> WASD or arrows to move, Space to steal, 1 Secure, 2 Swap, V view, ? help.</p>' +
  '<p><b>Touch:</b> left thumb anywhere on the left half to steer; Steal, Secure and Swap under the right thumb.</p>';

export class Help {
  private readonly overlay: HTMLElement;

  constructor(overlay: HTMLElement, button: HTMLButtonElement) {
    this.overlay = overlay;
    overlay.innerHTML =
      '<div class="card"><h2>How to play</h2><ol>' +
      RULES.map((r) => `<li>${r.drawing}<span>${r.text}</span></li>`).join('') +
      `</ol>${CONTROLS}<p class="small">Tap anywhere or press any key to close.</p></div>`;
    overlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.close();
    });
    button.addEventListener('click', () => {
      this.open();
    });
    // Capture phase: while open, a key only closes the help and reaches no game control.
    window.addEventListener(
      'keydown',
      (e) => {
        if (!overlay.hidden) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.close();
        } else if (e.key === '?') this.open();
      },
      { capture: true },
    );
    if (readSetting(SEEN_KEY) !== '1') this.open();
  }

  open(): void {
    this.overlay.hidden = false;
  }

  private close(): void {
    this.overlay.hidden = true;
    writeSetting(SEEN_KEY, '1');
  }
}
