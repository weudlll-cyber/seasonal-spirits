// Seasonal Sumo — the help overlay (owner's observation 2026-11-15: the rules were not
// understood): the mode's three short rules in plain words and the jump (JUMP 2026-11-17), each
// with a small drawing made in code; in sumo the variant's rule in one sentence (LIVES 2026-11-17); "What you see": every
// mark on the field, as the game draws it (LEGEND); and the controls. Shown once on the first
// visit, any time with "?" or the band's "?" button. The card scrolls with a finger or the mouse
// wheel; the "×" at its top right, a tap outside it or any key closes it (owner 2026-11-20: on a
// phone every touch closed it, so its end was out of reach). It follows the match on screen.
// While more of the card lies below its bottom edge a fade shows there, gone at the end (owner
// 2026-11-20: its last line was cut in half with no hint of more).

import type { GameMode } from '@seasonal-spirits/game-core';
import { STATE_LAST_STANDING } from '@seasonal-spirits/protocol';
import {
  LEGEND,
  LIGHT,
  SEASON_COLOURS,
  readSetting,
  variantName,
  writeSetting,
  type LegendMarker,
} from '@seasonal-spirits/render';

const SEEN_KEY = 'seasonal-spirits.help-seen';
const [SPRING, SUMMER, AUTUMN, WINTER] = SEASON_COLOURS;

// The Sky Island look in small (render palette.ts LIGHT): ink outlines; text and rings in the
// card's own text colour, so they read in both looks.
const INK = LIGHT.ink;
const ghost = (x: number, y: number, r: number, fill: string): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.04}" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>` +
  `<circle cx="${x - r * 0.33}" cy="${y - r * 0.2}" r="${r * 0.22}" fill="#fff"/>` +
  `<circle cx="${x + r * 0.33}" cy="${y - r * 0.2}" r="${r * 0.22}" fill="#fff"/>`;
const label = (x: number, y: number, text: string): string =>
  `<text x="${x}" y="${y}" fill="currentColor" font-size="13" text-anchor="middle">${text}</text>`;
// The own marks as own.ts (render) draws them: the ring in the team's colour, white-edged and
// ink-outlined; the arrow in the team's colour with "YOU" above it.
const groundRing = (x: number, y: number, r: number, colour: string): string =>
  [
    [INK, 7],
    ['#fff', 5],
    [colour, 3],
  ]
    .map(
      ([stroke, width]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.42}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`,
    )
    .join('');
const arrow = (x: number, y: number, colour: string): string =>
  `<path d="M${x} ${y} l-9 -8 h5 v-6 h8 v6 h5 z" fill="${colour}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
  `<text x="${x}" y="${y - 16}" fill="#fff" stroke="${INK}" stroke-width="2.5" paint-order="stroke" font-size="9" font-weight="700" text-anchor="middle">YOU</text>`;
const dashedRing = (x: number, y: number, r: number): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>`;
// The island's grass top, and the dashed crack where it breaks next.
const island = (r: number): string =>
  `<ellipse cx="60" cy="30" rx="${r * 1.6}" ry="${r * 0.9}" fill="${LIGHT.grass}" stroke="${INK}" stroke-width="2.5"/>`;
const crack = (r: number): string =>
  `<ellipse cx="60" cy="30" rx="${r * 1.6}" ry="${r * 0.9}" fill="none" stroke="${LIGHT.crack}" stroke-width="2.5" stroke-dasharray="6 4"/>`;
const zone = (r: number, colour: string, dash = ''): string =>
  `<ellipse cx="60" cy="30" rx="${r * 1.3}" ry="${r * 0.8}" fill="${dash ? 'none' : colour}" fill-opacity="0.35" stroke="${dash ? colour : INK}" stroke-width="2" stroke-dasharray="${dash}"/>`;
// The walled modes' platform with its fence.
const walls = (): string =>
  `<rect x="6" y="3" width="108" height="54" rx="8" fill="${LIGHT.grass}" stroke="${INK}" stroke-width="2.5"/>` +
  `<rect x="11" y="8" width="98" height="44" rx="4" fill="none" stroke="${LIGHT.roots}" stroke-width="2"/>`;
// The ticking bomb as bomb.ts (render) draws it: ink-outlined, a fuse, a spark.
const bomb = (x: number, y: number): string =>
  `<circle cx="${x}" cy="${y}" r="6" fill="#3a3150" stroke="${INK}" stroke-width="1.5"/>` +
  `<path d="M${x + 3} ${y - 6} q1 -6 7 -7" fill="none" stroke="#c8a46e" stroke-width="2"/>` +
  `<circle cx="${x + 10}" cy="${y - 13}" r="3" fill="#ffd54a"/>`;
// The "no return" mark as no-return.ts (render) draws it: a white pill, a U-turn arrow crossed out.
const noReturn = (x: number, y: number): string =>
  `<rect x="${x - 13}" y="${y - 8}" width="26" height="16" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
  `<path d="M${x + 4} ${y + 3} v-3 a4 4 0 0 0 -8 0 v3 m-2 -2 l2 3 l2 -3" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="M${x - 7} ${y + 5} L${x + 7} ${y - 5}" stroke="#d6334a" stroke-width="1.8" stroke-linecap="round"/>`;
const svg = (body: string): string =>
  `<svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">${body}</svg>`;

// A fast character's puffs, as ghosts.ts draws them: three white puffs, fading behind it.
const puffs = (): string =>
  [
    [24, 44, 3, 0.4],
    [40, 40, 4, 0.65],
    [56, 36, 5, 0.9],
  ]
    .map(
      ([x, y, r, alpha]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="${alpha}" stroke="${INK}" stroke-width="1.2"/>`,
    )
    .join('');

const DASH = {
  text: 'Dash with Space or the Dash button: a short burst that knocks whoever you hit far away. It needs a moment to recharge.',
  drawing: svg(puffs() + ghost(76, 31, 9, AUTUMN) + ghost(100, 28, 9, WINTER)),
};

// The jump, as ghosts.ts draws it: larger, over its shadow, a dash passing underneath.
const JUMP = {
  text: 'Jump with Shift or the Jump button: half a second in the air — no dash can hit you and you push nobody, but you can barely steer. Land outside the arena and you fall.',
  drawing: svg(
    puffs() +
      ghost(72, 38, 8, SUMMER) +
      '<ellipse cx="94" cy="42" rx="9" ry="4" fill="#000" fill-opacity="0.45"/>' +
      ghost(90, 26, 11, WINTER),
  ),
};

// Static text and drawings only; nothing from the server or the player goes in here. Three
// rules per mode, then the jump (a hidden button when the owner's switch has it off).
const RULES: Record<GameMode, { text: string; drawing: string }[]> = {
  sumo: [
    {
      text: 'Push the other teams off the arena. Every fall costs a life; with none left you watch until the next match.',
      drawing: svg(island(26) + ghost(54, 30, 9, SPRING) + ghost(88, 30, 8, SUMMER)),
    },
    DASH,
    {
      text: 'At every halving the arena halves. A dashed ring shows the new edge before it comes.',
      drawing: svg(island(26) + crack(18)),
    },
    JUMP,
  ],
  hill: [
    {
      text: 'Stand in the glowing zone: every second there scores a point for you and your team. Walls all round, nobody falls.',
      drawing: svg(
        walls() + zone(20, SPRING) + ghost(56, 30, 7, SPRING) + ghost(96, 40, 7, WINTER),
      ),
    },
    { ...DASH, text: 'Push the other teams out of the zone. ' + DASH.text },
    {
      text: "At every halving the zone jumps to the new season's corner and halves. A dashed ring shows where it goes.",
      drawing: svg(
        walls() +
          zone(18, SPRING) +
          `<g transform="translate(30 0)">${zone(13, SUMMER, '5 4')}</g>`,
      ),
    },
    JUMP,
  ],
  bomb: [
    {
      text: 'Everyone scores a point every second. A few ghosts carry a ticking bomb; its fuse is the time left.',
      drawing: svg(walls() + ghost(44, 40, 8, SPRING) + bomb(44, 22) + ghost(84, 40, 8, WINTER)),
    },
    {
      text: 'Carrying one? Touch a ghost of another team to pass it on (Dash helps) — it cannot come straight back for a second.',
      drawing: svg(puffs() + ghost(76, 34, 9, SUMMER) + ghost(98, 34, 9, AUTUMN) + bomb(98, 16)),
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
  own: svg(
    groundRing(60, 48, 16, WINTER) +
      ghost(60, 38, 10, WINTER) +
      arrow(60, 25, WINTER) +
      label(88, 14, 'You'),
  ),
  fast: svg(puffs() + ghost(80, 30, 10, AUTUMN)),
  protected: svg(ghost(60, 30, 10, SPRING) + dashedRing(60, 30, 19)),
  edge: svg(island(24)),
  nextEdge: svg(island(24) + crack(16)),
  zone: svg(
    walls() + zone(18, SPRING) + `<g transform="translate(30 0)">${zone(12, SUMMER, '5 4')}</g>`,
  ),
  bomb: svg(ghost(60, 42, 9, WINTER) + bomb(60, 22)),
  noReturn: svg(ghost(60, 42, 9, SUMMER) + noReturn(60, 22)),
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
  `<div class="card"><button class="close" type="button" aria-label="Close help">×</button>` +
  `<h2>How to play: ${name}</h2>${rule ? `<p>${rule}</p>` : ''}<ol>` +
  RULES[mode].map((r) => `<li>${r.drawing}<span>${r.text}</span></li>`).join('') +
  `</ol>${SEEN}${CONTROLS}<p class="small">Scroll for more. Close with ×, a tap outside the card or any key.</p></div>`;

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
    this.overlay.innerHTML = content(mode, name, rule);
    this.hint();
  }

  open(): void {
    this.overlay.hidden = false;
    this.hint();
  }

  // The fade at the card's bottom edge while more follows (styles/controls.css `#help .card.more`).
  private hint(): void {
    const card = this.overlay.firstElementChild;
    if (card instanceof HTMLElement) card.classList.toggle('more', moreBelow(card));
  }

  private close(): void {
    this.overlay.hidden = true;
    writeSetting(SEEN_KEY, '1');
  }
}
