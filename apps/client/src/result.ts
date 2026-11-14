// Seasonal Spirits — the result screen after a match: secured value per team and per player,
// the own place, the time to the next match, and the bridge box of CONCEPT.md §8 (on by
// default, switched off in config.ts). All numbers come from the final state.

import { GHOST_BOT, ghostName, type ServerState } from '@seasonal-spirits/protocol';
import { mmss, seasonColour, seasonName, value } from '@seasonal-spirits/render';
import { BRIDGE_TEXT, CLIENT_CONFIG } from './config.js';
import { el } from './hud.js';

const SHOWN_PLAYERS = 8;

export class ResultScreen {
  private readonly root = el('result');
  private readonly teams = el('result-teams');
  private readonly players = el('result-players');
  private readonly place = el('result-place');
  private readonly next = el('result-next');
  private shownFor: number | null = null; // matchMs of the result on screen

  constructor() {
    const bridge = el('bridge');
    bridge.hidden = !CLIENT_CONFIG.bridge.enabled;
    el('bridge-text').textContent = BRIDGE_TEXT;
    el('start-here', HTMLAnchorElement).href = CLIENT_CONFIG.bridge.startHereUrl;
    el('simulator', HTMLAnchorElement).href = CLIENT_CONFIG.bridge.simulatorUrl;
  }

  // Called with the newest state; draws the table once per match, ticks the countdown.
  update(s: ServerState | undefined, resultShown: boolean, ownId: number | null): void {
    this.root.hidden = !resultShown || !s;
    if (!resultShown || !s) {
      this.shownFor = null;
      return;
    }
    this.next.textContent = `Next match in ${mmss(s.nextMatchMs)}`;
    if (this.shownFor === s.matchMs) return;
    this.shownFor = s.matchMs;
    this.fill(s, ownId);
  }

  private fill(s: ServerState, ownId: number | null): void {
    const order = [0, 1, 2, 3].sort((a, b) => (s.teamSecured[b] ?? 0) - (s.teamSecured[a] ?? 0));
    this.teams.replaceChildren(
      ...order.map((team, i) =>
        row(`${i + 1}. ${seasonName(team)}`, value(s.teamSecured[team] ?? 0), seasonColour(team)),
      ),
    );
    const ranked = [...s.ghosts].sort((a, b) => b.secured - a.secured || a.id - b.id);
    this.players.replaceChildren(
      ...ranked.slice(0, SHOWN_PLAYERS).map((g, i) => {
        const name = g.id === ownId ? 'You' : ghostName(g.id, (g.flags & GHOST_BOT) !== 0);
        return row(`${i + 1}. ${name}`, value(g.secured), seasonColour(g.team));
      }),
    );
    const own = ranked.findIndex((g) => g.id === ownId);
    this.place.hidden = own === -1;
    if (own !== -1) {
      const g = ranked[own];
      this.place.textContent = `Your place: ${own + 1} of ${ranked.length} — ${value(g?.secured ?? 0)} secured`;
    }
  }
}

function row(label: string, amount: string, colour: string): HTMLElement {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = label;
  name.style.color = colour;
  const v = document.createElement('span');
  v.textContent = amount;
  li.append(name, v);
  return li;
}
