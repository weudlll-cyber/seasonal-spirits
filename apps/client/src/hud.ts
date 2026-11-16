// Seasonal Sumo — the client's controls and messages on top of the canvas (DOM, so they are
// real buttons): the Dash button with its cooldown ring, the HALVING and MATCH OVER
// announcements with their flash, and notices.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import {
  STATE_MATCH_END_EVENT,
  type GameAction,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { seasonName, type Rect } from '@seasonal-spirits/render';

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
  private readonly dash = el('dash', HTMLButtonElement);
  private readonly announce = el('announce');
  private readonly flash = el('flash');
  private readonly notice = el('notice');
  private announceTimer: number | undefined;

  constructor(act: (a: GameAction) => void) {
    // pointerdown, not click: a thumb on the button must not wait for its release.
    this.dash.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      act('dash');
    });
  }

  // Players only: the Dash button, its ring filling up while the server's cooldown runs.
  showControls(playing: boolean, dashLeftMs: number): void {
    this.dash.hidden = !playing;
    const ready = 1 - Math.min(1, dashLeftMs / DEFAULT_CONFIG.dashCooldownMs);
    this.dash.style.setProperty('--ready', ready.toFixed(3));
    this.dash.classList.toggle('ready', dashLeftMs === 0);
  }

  // A large announcement and a short flash at every deadline — "HALVING — the arena halves ·
  // <Season> is in season" at a halving, "MATCH OVER" at the match end.
  deadline(s: ServerState): void {
    const end = (s.flags & STATE_MATCH_END_EVENT) !== 0;
    this.announce.textContent = end
      ? 'MATCH OVER'
      : `HALVING — the arena halves · ${seasonName(s.season)} is in season`;
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

// What of the HUD lies on the field (session 2026-11-15-B). Controls: the visible Dash
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
