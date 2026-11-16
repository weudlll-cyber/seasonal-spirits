// Seasonal Spirits — the client's controls and messages on top of the canvas (DOM, so they are
// real buttons): the one action button, at the own shrine "Secure (…)" and "Swap (…)" with the
// server's numbers, the two team signals, the HALVING and MATCH OVER announcements with their
// flash, and notices.

import {
  STATE_MATCH_END_EVENT,
  type GameAction,
  type OfferState,
  type ServerState,
  type TeamSignal,
} from '@seasonal-spirits/protocol';
import { seasonName, value, type Rect } from '@seasonal-spirits/render';

const ANNOUNCE_MS = 3500;
// "MATCH OVER" stays this long; then the result screen takes its place (main.ts).
export const MATCH_OVER_MS = 2000;
const TOAST_MS = 2500; // how long a steal message stays

// An element of index.html, checked to be of the expected kind.
function el<T extends HTMLElement>(id: string, kind: new () => T): T;
function el(id: string): HTMLElement;
function el(id: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
  const found = document.getElementById(id);
  if (!(found instanceof kind)) throw new Error(`client: #${id} missing from index.html`);
  return found;
}

export class Hud {
  private readonly steal = el('steal', HTMLButtonElement);
  private readonly secure = el('secure', HTMLButtonElement);
  private readonly swap = el('swap', HTMLButtonElement);
  private readonly shrine = el('shrine');
  private readonly signals = el('signals');
  private readonly announce = el('announce');
  private readonly flash = el('flash');
  private readonly notice = el('notice');
  private readonly toastLine = el('toast');
  private announceTimer: number | undefined;
  private toastTimer: number | undefined;

  constructor(act: (a: GameAction) => void, signal: (s: TeamSignal) => void) {
    // pointerdown, not click: a thumb on the right button must not wait for its release.
    const bind = (b: HTMLButtonElement, run: () => void): void => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!b.disabled) run();
      });
    };
    for (const [b, a] of [
      [this.steal, 'steal'],
      [this.secure, 'secure'],
      [this.swap, 'swap'],
    ] as const) {
      bind(b, () => {
        act(a);
      });
    }
    // The two team signals (owner decision 2026-11-16), small, above the action buttons.
    for (const [id, s] of [
      ['signal-attack', 'attack'],
      ['signal-home', 'home'],
    ] as const) {
      bind(el(id, HTMLButtonElement), () => {
        signal(s);
      });
    }
  }

  // Players only: the shrine buttons replace the action button while the server sends an
  // offer for the own ghost; every number on them is the server's.
  // The Steal button is lit only while the server says a steal would take something now
  // (GHOST_CAN_STEAL), dimmed otherwise; it can always be pressed.
  showControls(
    playing: boolean,
    offer: OfferState | undefined,
    season: number,
    canSteal: boolean,
  ): void {
    this.signals.hidden = !playing;
    this.steal.hidden = !playing || offer !== undefined;
    this.steal.classList.toggle('lit', canSteal);
    this.shrine.hidden = !playing || offer === undefined;
    if (!offer) return;
    this.secure.textContent = `Secure (${value(offer.secureValue)})`;
    this.secure.disabled = offer.secureValue === 0;
    this.swap.textContent =
      `Swap (${offer.swapCoins} ${seasonName(season + 1)}, worth ` +
      `${value(offer.swapValueNow)} now / ${value(offer.swapValueLater)} later)`;
    this.swap.disabled = offer.swapCoins === 0;
  }

  // CONCEPT.md §2b: a large announcement and a short flash at every deadline — "HALVING —
  // <Season> is in season" at a halving, "MATCH OVER" at the match end (2026-11-16).
  deadline(s: ServerState): void {
    const end = (s.flags & STATE_MATCH_END_EVENT) !== 0;
    this.announce.textContent = end
      ? 'MATCH OVER'
      : `HALVING — ${seasonName(s.season)} is in season`;
    this.announce.hidden = false;
    this.flash.classList.remove('go');
    this.flash.getBoundingClientRect(); // a reflow restarts the CSS animation
    this.flash.classList.add('go');
    window.clearTimeout(this.announceTimer);
    this.announceTimer = window.setTimeout(
      () => {
        this.announce.hidden = true;
      },
      end ? MATCH_OVER_MS : ANNOUNCE_MS,
    );
  }

  say(text: string | null): void {
    this.notice.textContent = text ?? '';
    this.notice.hidden = text === null;
  }

  // A short message for a steal this player took part in ("You stole 3 from Bot 7").
  toast(text: string): void {
    this.toastLine.textContent = text;
    this.toastLine.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastLine.hidden = true;
    }, TOAST_MS);
  }
}

export function bindMute(toggle: () => boolean, muted: boolean): void {
  const button = el('mute', HTMLButtonElement);
  const label = (m: boolean): string => (m ? 'Sound off' : 'Sound on');
  button.textContent = label(muted);
  button.setAttribute('aria-pressed', String(muted));
  button.addEventListener('click', () => {
    const now = toggle();
    button.textContent = label(now);
    button.setAttribute('aria-pressed', String(now));
  });
}

// What of the HUD lies on the field (session 2026-11-15-B). Controls: the visible action or
// shrine buttons (bottom right); shrine labels move away from them. Thumb zones: the
// controls plus, on touch screens, where the left thumb rests on the joystick (bottom
// left); the shrine arrow keeps out of all of them, and the camera may look past the
// field's bottom edge by their height so the field rises above them.
const STICK_ZONE = { width: 220, height: 260 }; // pixels, at most half the screen wide

export interface HudOnField {
  controls: Rect[];
  zones: Rect[];
}

export function hudOnField(): HudOnField {
  const controls: Rect[] = [];
  const { left, top, right, bottom, width } = el('actions').getBoundingClientRect();
  // A plain object: a DOMRect's fields are getters that copying (and the specs) would lose.
  if (width > 0) controls.push({ left, top, right, bottom });
  const zones = [...controls];
  const body = document.body.classList;
  if (body.contains('touch') && !body.contains('spectating')) {
    const { innerWidth: w, innerHeight: h } = window;
    zones.push({
      left: 0,
      top: h - STICK_ZONE.height,
      right: Math.min(w / 2, STICK_ZONE.width),
      bottom: h,
    });
  }
  return { controls, zones };
}

export { el };
