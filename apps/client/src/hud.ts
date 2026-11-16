// Seasonal Spirits — the client's controls and messages on top of the canvas (DOM, so they are
// real buttons): at the own shrine "Secure (…)" with the server's number, the HALVING and MATCH
// OVER announcements with their flash, and notices. The Steal and Swap buttons and the team
// signals went with V5 (owner decision 2026-11-16).

import {
  STATE_MATCH_END_EVENT,
  type GameAction,
  type OfferState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { seasonName, value, type Rect } from '@seasonal-spirits/render';

const ANNOUNCE_MS = 3500;
// "MATCH OVER" stays this long; then the result screen takes its place (main.ts).
export const MATCH_OVER_MS = 2000;

// An element of index.html, checked to be of the expected kind.
function el<T extends HTMLElement>(id: string, kind: new () => T): T;
function el(id: string): HTMLElement;
function el(id: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
  const found = document.getElementById(id);
  if (!(found instanceof kind)) throw new Error(`client: #${id} missing from index.html`);
  return found;
}

export class Hud {
  private readonly secure = el('secure', HTMLButtonElement);
  private readonly shrine = el('shrine');
  private readonly announce = el('announce');
  private readonly flash = el('flash');
  private readonly notice = el('notice');
  private announceTimer: number | undefined;

  constructor(act: (a: GameAction) => void) {
    // pointerdown, not click: a thumb on the button must not wait for its release.
    this.secure.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.secure.disabled) act('secure');
    });
  }

  // Players only: the Secure button shows while the server sends an offer for the own ghost
  // (it stands in its own shrine); its number is the server's.
  showControls(playing: boolean, offer: OfferState | undefined): void {
    this.shrine.hidden = !playing || offer === undefined;
    if (!offer) return;
    this.secure.textContent = `Secure (${value(offer.secureValue)})`;
    this.secure.disabled = offer.secureValue === 0;
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

// What of the HUD lies on the field (session 2026-11-15-B). Controls: the visible Secure
// button (bottom right); shrine labels move away from them. Thumb zones: the
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
