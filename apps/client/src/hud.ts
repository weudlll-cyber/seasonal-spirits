// Seasonal Sumo — the client's DOM controls and messages over the canvas: Dash and Jump with their
// cooldown rings (Jump hidden when switched off), the HALVING and MATCH OVER banners, notices.

import type { Settings } from '@seasonal-spirits/game-core';
import {
  STATE_MATCH_END_EVENT,
  type GameAction,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { halvingBanner, type Rect } from '@seasonal-spirits/render';
import { fitBanner } from './banner-fit.js';

const ANNOUNCE_MS = 3500;
// "MATCH OVER" stays this long; then the result screen takes its place (main.ts).
export const MATCH_OVER_MS = 2000;

// An element of the page (index.html or the React frame, frame/*.tsx), checked to be of the
// expected kind.
function el<T extends HTMLElement>(id: string, kind: new () => T): T;
function el(id: string): HTMLElement;
function el(id: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
  const found = document.getElementById(id);
  if (!(found instanceof kind)) throw new Error(`client: #${id} missing from the page`);
  return found;
}

// An action button's state: shown or not, ms until it is ready, and its whole cooldown.
export interface ActionButton {
  shown: boolean;
  leftMs: number;
  cooldownMs: number;
}

// A round action button: hidden or shown, its ring filling while the cooldown runs.
function showButton(button: HTMLButtonElement, b: ActionButton): void {
  button.hidden = !b.shown;
  const ready = 1 - Math.min(1, b.leftMs / b.cooldownMs);
  button.style.setProperty('--ready', ready.toFixed(3));
  button.classList.toggle('ready', b.leftMs === 0);
}

export class Hud {
  private readonly dash = el('dash', HTMLButtonElement);
  private readonly jump = el('jump', HTMLButtonElement);
  private readonly stick = el('stick');
  private readonly announce = el('announce');
  private readonly flash = el('flash');
  private readonly notice = el('notice');
  private announceTimer: number | undefined;

  constructor(act: (a: GameAction) => void) {
    // pointerdown, not click: a thumb on the button must not wait for its release.
    for (const [button, action] of [
      [this.dash, 'dash'],
      [this.jump, 'jump'],
    ] as const) {
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        act(action);
      });
    }
  }

  // Players only: the Dash and Jump buttons, their rings filling up while the server's
  // cooldowns run (the match's settings), and on a touch screen the joystick — all gone while
  // there is nothing to steer (out of lives, the result; review 2026-11-20: the ring stayed).
  showControls(playing: boolean, dash: ActionButton, jump: ActionButton): void {
    this.stick.hidden = !playing;
    showButton(this.dash, { ...dash, shown: playing && dash.shown });
    showButton(this.jump, { ...jump, shown: playing && jump.shown });
  }

  // An announcement on the banner under the band and a short flash at every deadline — the
  // mode's halving ("HALVING — the arena halves · <Season> is in season", "HALVING — the bomb
  // goes off and the walls close in") or "MATCH OVER"; `tuning` the server's settings, if sent.
  deadline(s: ServerState, tuning: Settings | null): void {
    const end = (s.flags & STATE_MATCH_END_EVENT) !== 0;
    this.announce.textContent = end ? 'MATCH OVER' : `HALVING — ${halvingBanner(s, tuning)}`;
    this.announce.hidden = false;
    fitBanner(this.announce); // a phone: at most two lines inside the screen
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

  // `row`: a short notice in the row under the band (a spectator's), clear of the field.
  say(text: string | null, row = false): void {
    this.notice.textContent = text ?? '';
    this.notice.hidden = text === null;
    this.notice.classList.toggle('row', row);
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

// What of the HUD lies over the canvas (session 2026-11-15-B). Controls: the visible Dash and
// Jump buttons (bottom right). Thumb zones: the controls plus, on touch screens, where the left
// thumb rests on the joystick (bottom left); the camera fits the playing area clear of all of
// them (scene.ts). Banner: the bottom of the halving's banner while it shows, null otherwise —
// the follow camera's minimap goes below it (p20, 2026-11-19: the banner covered it).
const STICK_ZONE = { width: 220, height: 260 }; // pixels, at most half the screen wide

// The joystick's thumb zone on a `width` × `height` touch screen.
export function stickZone(width: number, height: number): Rect {
  return {
    left: 0,
    top: height - STICK_ZONE.height,
    right: Math.min(width / 2, STICK_ZONE.width),
    bottom: height,
  };
}

export interface HudOnField {
  controls: Rect[];
  zones: Rect[];
  banner: number | null;
}

export function hudOnField(): HudOnField {
  const controls: Rect[] = [];
  const { left, top, right, bottom, width } = el('actions').getBoundingClientRect();
  // A plain object: a DOMRect's fields are getters that copying (and the specs) would lose.
  if (width > 0) controls.push({ left, top, right, bottom });
  const zones = [...controls];
  const body = document.body.classList;
  if (body.contains('touch') && !body.contains('spectating')) {
    zones.push(stickZone(window.innerWidth, window.innerHeight));
  }
  const announce = el('announce');
  const banner = announce.hidden ? null : announce.getBoundingClientRect().bottom;
  return { controls, zones, banner };
}

export { el };
