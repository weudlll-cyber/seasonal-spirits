// Seasonal Sumo — the help overlay (owner's observation 2026-11-15: the rules were not
// understood): the mode's three short rules in plain words and the jump (JUMP 2026-11-17), each
// with a small drawing made in code; in sumo the variant's rule in one sentence (LIVES 2026-11-17); "What you see": every
// mark on the field, as the game draws it (LEGEND); and the controls. Shown once on the first
// visit, any time with "?" or the band's "?" button; one tap or any key closes it. It follows
// the match on screen.

import type { GameMode } from '@seasonal-spirits/game-core';
import { STATE_LAST_STANDING } from '@seasonal-spirits/protocol';
import {
  LEGEND,
  SEASON_COLOURS,
  TEXT,
  variantName,
  type LegendMarker,
} from '@seasonal-spirits/render';
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
const zone = (r: number, colour: string, dash = ''): string =>
  `<circle cx="60" cy="30" r="${r}" fill="${dash ? 'none' : colour}" fill-opacity="0.25" stroke="${colour}" stroke-width="2" stroke-dasharray="${dash}"/>`;
const walls = (colour: string): string =>
  `<rect x="6" y="3" width="108" height="54" fill="none" stroke="${colour}" stroke-width="3"/>`;
// The ticking bomb as bomb.ts (render) draws it: black with a pale rim, a fuse, a spark.
const bomb = (x: number, y: number): string =>
  `<circle cx="${x}" cy="${y}" r="6" fill="#0b0b0d" stroke="#d9dee4" stroke-width="1.5"/>` +
  `<path d="M${x + 3} ${y - 6} q1 -6 7 -7" fill="none" stroke="#c8a46e" stroke-width="2"/>` +
  `<circle cx="${x + 10}" cy="${y - 13}" r="3" fill="#ffd54a"/>`;
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

const DASH = {
  text: 'Dash with Space or the Dash button: a short burst that knocks whoever you hit far away. It needs a moment to recharge.',
  drawing: svg(trail(AUTUMN) + ghost(76, 31, 9, AUTUMN) + ghost(100, 28, 9, WINTER)),
};

// The jump, as ghosts.ts draws it: larger, over its shadow, a dash passing underneath.
const JUMP = {
  text: 'Jump with Shift or the Jump button: half a second in the air — no dash can hit you and you push nobody, but you can barely steer. Land outside the arena and you fall.',
  drawing: svg(
    trail(SUMMER) +
      ghost(72, 38, 8, SUMMER) +
      '<ellipse cx="94" cy="42" rx="9" ry="4" fill="#000" fill-opacity="0.45"/>' +
      ghost(90, 26, 11, WINTER),
  ),
};

// Static text and drawings only; nothing from the server or the player goes in here. Three
// rules per mode, then the jump (a hidden button when the owner's switch has it off).
export const RULES: Record<GameMode, { text: string; drawing: string }[]> = {
  sumo: [
    {
      text: 'Push the other teams off the arena. Every fall costs a life; with none left you watch until the next match.',
      drawing: svg(arc(26, SUMMER) + ghost(54, 30, 9, SPRING) + ghost(88, 30, 8, SUMMER)),
    },
    DASH,
    {
      text: 'At every halving the arena halves. A dashed ring shows the new edge before it comes.',
      drawing: svg(arc(26, SPRING) + arc(18, SPRING, '5 4')),
    },
    JUMP,
  ],
  hill: [
    {
      text: 'Stand in the glowing zone: every second there scores a point for you and your team. Walls all round, nobody falls.',
      drawing: svg(
        walls(SPRING) + zone(20, SPRING) + ghost(56, 30, 7, SPRING) + ghost(96, 40, 7, WINTER),
      ),
    },
    { ...DASH, text: 'Push the other teams out of the zone. ' + DASH.text },
    {
      text: "At every halving the zone jumps to the new season's corner and halves. A dashed ring shows where it goes.",
      drawing: svg(
        walls(SUMMER) +
          zone(18, SPRING) +
          `<g transform="translate(30 0)">${zone(13, SUMMER, '5 4')}</g>`,
      ),
    },
    JUMP,
  ],
  bomb: [
    {
      text: 'Everyone scores a point every second. A few ghosts carry a ticking bomb; its fuse is the time left.',
      drawing: svg(
        walls(AUTUMN) + ghost(44, 40, 8, SPRING) + bomb(44, 22) + ghost(84, 40, 8, WINTER),
      ),
    },
    {
      text: 'Carrying one? Touch a ghost of another team to pass it on (Dash helps) — it cannot come straight back for a second.',
      drawing: svg(
        trail(SUMMER) + ghost(76, 34, 9, SUMMER) + ghost(98, 34, 9, AUTUMN) + bomb(98, 16),
      ),
    },
    {
      text: 'At every halving the bombs go off: whoever holds one loses half their points. New bombs go out.',
      drawing: svg(bomb(52, 36) + label(84, 40, '÷2')),
    },
    JUMP,
  ],
};

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
  zone: svg(
    walls(SPRING) +
      zone(18, SPRING) +
      `<g transform="translate(30 0)">${zone(12, SUMMER, '5 4')}</g>`,
  ),
  bomb: svg(ghost(60, 42, 9, WINTER) + bomb(60, 22)),
};

const SEEN =
  '<h3>What you see</h3><ol>' +
  LEGEND.map((l) => `<li>${MARKER_DRAWINGS[l.marker]}<span>${l.text}</span></li>`).join('') +
  '</ol>';

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
  `<div class="card"><h2>How to play: ${name}</h2>${rule ? `<p>${rule}</p>` : ''}<ol>` +
  RULES[mode].map((r) => `<li>${r.drawing}<span>${r.text}</span></li>`).join('') +
  `</ol>${SEEN}${CONTROLS}<p class="small">Tap anywhere or press any key to close.</p></div>`;

export class Help {
  private readonly overlay: HTMLElement;
  private shown: string | null = null; // the mode, name and rule on screen

  constructor(overlay: HTMLElement, button: HTMLButtonElement) {
    this.overlay = overlay;
    this.show('sumo', 'Seasonal Sumo', null);
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

  // The rules of the match on screen; rebuilt only when they change (the server's rotation,
  // sumo's variants in turn, the lives).
  show(mode: GameMode, name: string, rule: string | null): void {
    const key = `${mode}|${name}|${rule ?? ''}`;
    if (key === this.shown) return;
    this.shown = key;
    this.overlay.innerHTML = content(mode, name, rule);
  }

  open(): void {
    this.overlay.hidden = false;
  }

  private close(): void {
    this.overlay.hidden = true;
    writeSetting(SEEN_KEY, '1');
  }
}
