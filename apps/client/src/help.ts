// Seasonal Sumo — the help overlay (owner's observation 2026-11-15: the rules were not
// understood): three short rules in plain words, each with a small drawing made in code;
// "What you see": every mark on the field, as the game draws it (LEGEND); and the controls.
// Shown once on the first visit, any time with "?" or the band's "?" button; one tap or any
// key closes it.

import { LEGEND, SEASON_COLOURS, TEXT, type LegendMarker } from '@seasonal-spirits/render';
import { readSetting, writeSetting } from './storage.js';

const SEEN_KEY = 'seasonal-spirits.help-seen';
const [SPRING, SUMMER, AUTUMN, WINTER] = SEASON_COLOURS;

const ghost = (x: number, y: number, r: number, fill: string): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const label = (x: number, y: number, text: string): string =>
  `<text x="${x}" y="${y}" fill="${TEXT}" font-size="13" text-anchor="middle">${text}</text>`;
const ring = (x: number, y: number, r: number, width: number): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${TEXT}" stroke-width="${width}"/>`;
const dashedRing = (x: number, y: number, r: number): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${TEXT}" stroke-width="2" stroke-dasharray="4 4"/>`;
const arc = (r: number, colour: string, dash = ''): string =>
  `<circle cx="60" cy="30" r="${r}" fill="none" stroke="${colour}" stroke-width="3" stroke-dasharray="${dash}"/>`;
const svg = (body: string): string =>
  `<svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">${body}</svg>`;

// A fast ghost's trail, as ghosts.ts draws it: fading and thinning away from the ghost.
const trail = (colour: string): string =>
  [
    [16, 46, 34, 42, 0.12, 2],
    [34, 42, 52, 37, 0.25, 4],
    [52, 37, 70, 32, 0.4, 7],
  ]
    .map(
      ([x1, y1, x2, y2, alpha, width]) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-opacity="${alpha}" stroke-width="${width}" stroke-linecap="round"/>`,
    )
    .join('');

// Static text and drawings only; nothing from the server or the player goes in here.
const RULES: { text: string; drawing: string }[] = [
  {
    text: 'Push the other teams off the arena. Every ghost you push off scores a point for your team.',
    drawing: svg(arc(26, SUMMER) + ghost(54, 30, 9, SPRING) + ghost(88, 30, 8, SUMMER)),
  },
  {
    text: 'Dash with Space or the Dash button: a short burst that knocks whoever you hit far away. It needs a moment to recharge.',
    drawing: svg(trail(AUTUMN) + ghost(76, 31, 9, AUTUMN) + ghost(100, 28, 9, WINTER)),
  },
  {
    text: 'At every halving the arena halves. A dashed ring shows the new edge before it comes.',
    drawing: svg(arc(26, SPRING) + arc(18, SPRING, '5 4')),
  },
];

// One drawing per mark of "What you see"; the record makes a new mark need its drawing.
const MARKER_DRAWINGS: Record<LegendMarker, string> = {
  team: svg(
    ghost(35, 38, 9, SPRING) +
      label(35, 20, 'Bot 3 · 2') +
      ghost(85, 38, 9, WINTER) +
      label(85, 20, '7'),
  ),
  own: svg(ghost(60, 38, 10, WINTER) + ring(60, 38, 14, 3) + label(60, 17, 'You')),
  fast: svg(trail(AUTUMN) + ghost(80, 30, 10, AUTUMN)),
  protected: svg(ghost(60, 30, 10, SPRING) + dashedRing(60, 30, 19)),
  edge: svg(arc(24, SUMMER)),
  nextEdge: svg(arc(24, SUMMER) + arc(16, SUMMER, '5 4')),
};

const SEEN =
  '<h3>What you see</h3><ol>' +
  LEGEND.map((l) => `<li>${MARKER_DRAWINGS[l.marker]}<span>${l.text}</span></li>`).join('') +
  '</ol>';

const CONTROLS =
  '<p><b>Keyboard:</b> WASD or arrows to move, Space to dash, V view, ? help.</p>' +
  '<p><b>Touch:</b> left thumb anywhere on the left half to steer; Dash under the right thumb.</p>';

export class Help {
  private readonly overlay: HTMLElement;

  constructor(overlay: HTMLElement, button: HTMLButtonElement) {
    this.overlay = overlay;
    overlay.innerHTML =
      '<div class="card"><h2>How to play</h2><ol>' +
      RULES.map((r) => `<li>${r.drawing}<span>${r.text}</span></li>`).join('') +
      `</ol>${SEEN}${CONTROLS}<p class="small">Tap anywhere or press any key to close.</p></div>`;
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
