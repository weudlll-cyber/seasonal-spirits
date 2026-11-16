// Seasonal Spirits — the help overlay (owner's observation 2026-11-15: the rules were not
// understood): the five rules of V5 (CONCEPT.md §2a) in plain words, each with a small drawing
// made in code, the price board among them; "What you see": every marker on the field, as the
// game draws it (LEGEND); and the controls. Shown once on the first visit, any time with "?"
// or the band's "?" button; one tap or any key closes it. Prices and the season length come
// from the game config.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { LEGEND, SEASON_COLOURS, TEXT, value, type LegendMarker } from '@seasonal-spirits/render';
import { readSetting, writeSetting } from './storage.js';

const SEEN_KEY = 'seasonal-spirits.help-seen';
const [SPRING, SUMMER, AUTUMN, WINTER] = SEASON_COLOURS;
const { prices, seasonDurationMs } = DEFAULT_CONFIG;
const [IN_SEASON, NEXT, OTHER] = [value(prices.inSeason), value(prices.next), value(prices.other)];

const diamond = (x: number, y: number, fill: string): string =>
  `<path d="M${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}L${x - 9} ${y}Z" fill="${fill}" stroke="#fff" stroke-width="1"/>`;
const ghost = (x: number, y: number, r: number, fill: string): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const label = (x: number, y: number, text: string): string =>
  `<text x="${x}" y="${y}" fill="${TEXT}" font-size="13" text-anchor="middle">${text}</text>`;
const ring = (x: number, y: number, r: number, width: number): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${TEXT}" stroke-width="${width}"/>`;
const svg = (body: string): string =>
  `<svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">${body}</svg>`;

// Static text and drawings only; nothing from the server or the player goes in here. The five
// rules of V5 (owner decision 2026-11-16), drawn with Summer in season.
const RULES: { text: string; drawing: string }[] = [
  {
    text: 'Coins of all four seasons fall on the field. Walk over any coin to pick it up.',
    drawing: svg(
      diamond(18, 22, SPRING) +
        diamond(46, 38, SUMMER) +
        diamond(74, 22, AUTUMN) +
        diamond(102, 38, WINTER),
    ),
  },
  {
    text: `The price board at the top shows what one coin of each season is worth right now: the season in season ${IN_SEASON}, the next season ${NEXT}, the other two ${OTHER} each.`,
    drawing: svg(
      diamond(20, 22, SUMMER) +
        label(20, 52, IN_SEASON) +
        diamond(60, 22, AUTUMN) +
        label(60, 52, NEXT) +
        diamond(100, 22, WINTER) +
        label(100, 52, OTHER),
    ),
  },
  {
    text: `Every ${seasonDurationMs / 1000} seconds comes the halving: the next season comes into season and the prices move on. A coin of the next season rises from ${NEXT} to ${IN_SEASON}.`,
    drawing: svg(
      diamond(30, 24, AUTUMN) +
        label(30, 54, NEXT) +
        label(60, 30, '→') +
        diamond(90, 24, AUTUMN) +
        label(90, 54, IN_SEASON),
    ),
  },
  {
    text: 'At your own shrine, Secure banks everything you carry at the prices of that moment; secured points are safe. Carrying makes you bigger and slower. Coins still carried at the end count nothing.',
    drawing: svg(
      `<circle cx="30" cy="30" r="24" fill="none" stroke="${SPRING}" stroke-width="3"/>` +
        label(30, 35, 'Bank') +
        ghost(80, 30, 14, SPRING),
    ),
  },
  {
    text: 'The team with the most secured points wins.',
    drawing: svg(label(60, 26, '1. Summer') + label(60, 46, '2. Winter')),
  },
];

// A carrier's trail, as ghosts.ts draws it: fading and thinning away from the ghost.
const TRAIL = [
  [16, 46, 34, 42, 0.12, 2],
  [34, 42, 52, 37, 0.25, 4],
  [52, 37, 70, 32, 0.4, 7],
]
  .map(
    ([x1, y1, x2, y2, alpha, width]) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${AUTUMN}" stroke-opacity="${alpha}" stroke-width="${width}" stroke-linecap="round"/>`,
  )
  .join('');

// One drawing per marker of "What you see"; the record makes a new marker need its drawing.
const MARKER_DRAWINGS: Record<LegendMarker, string> = {
  team: svg(
    ghost(35, 38, 9, SPRING) +
      label(35, 20, 'Bot 3') +
      ghost(85, 38, 9, WINTER) +
      label(85, 20, '7'),
  ),
  shrine: svg(
    `<circle cx="60" cy="38" r="18" fill="${SPRING}" fill-opacity="0.15" stroke="${SPRING}" stroke-width="2" stroke-dasharray="5 4"/>` +
      `<text x="60" y="14" fill="${SPRING}" font-size="13" font-weight="bold" text-anchor="middle">Spring shrine</text>`,
  ),
  coin: svg(diamond(30, 30, SPRING) + diamond(60, 30, SUMMER) + diamond(90, 30, WINTER)),
  carrier: svg(ghost(25, 40, 6, SPRING) + ghost(80, 40, 12, SPRING) + label(80, 20, 'Bot 3 · 9')),
  trail: svg(TRAIL + ghost(80, 30, 10, AUTUMN)),
  own: svg(ghost(60, 38, 10, WINTER) + ring(60, 38, 14, 3) + label(60, 17, 'You')),
  securing: svg(ghost(60, 32, 10, SPRING) + ring(60, 32, 19, 2)),
};

const SEEN =
  '<h3>What you see</h3><ol>' +
  LEGEND.map((l) => `<li>${MARKER_DRAWINGS[l.marker]}<span>${l.text}</span></li>`).join('') +
  '</ol>';

const CONTROLS =
  '<p><b>Keyboard:</b> WASD or arrows to move, 1 Secure, V view, ? help.</p>' +
  '<p><b>Touch:</b> left thumb anywhere on the left half to steer; Secure under the right thumb.</p>';

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
