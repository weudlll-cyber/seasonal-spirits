// Seasonal Sumo — the result screen after a match: the mode's awards, the mode's score
// (knockouts or points) per team and per player, the own place, the time to the next match, and the bridge box of
// CONCEPT.md §8 (on by default, switched off in config.ts). Result and awards come from the
// server's recap message, the names and the time to the next match from the state.

import {
  GHOST_BOT,
  ghostName,
  type ServerRecap,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { mmss, modeWords, seasonColour, seasonName } from '@seasonal-spirits/render';
import { BRIDGE_TEXT, CLIENT_CONFIG } from './config.js';
import { el } from './hud.js';

const SHOWN_PLAYERS = 8;

// A ghost as every screen names it: "You" for the own one, else "Bot 7" or "Player 7".
export function nameIn(s: ServerState | undefined, ghost: number, ownId: number | null): string {
  if (ghost === ownId) return 'You';
  const flags = s?.ghosts.find((g) => g.id === ghost)?.flags ?? 0;
  return ghostName(ghost, (flags & GHOST_BOT) !== 0);
}

export class ResultScreen {
  private readonly root = el('result');
  private readonly awardsBox = el('result-awards-box');
  private readonly awards = el('result-awards');
  private readonly teams = el('result-teams');
  private readonly players = el('result-players');
  private readonly place = el('result-place');
  private readonly next = el('result-next');
  private shown: ServerRecap | null = null; // the recap on screen

  constructor() {
    const bridge = el('bridge');
    bridge.hidden = !CLIENT_CONFIG.bridge.enabled;
    el('bridge-text').textContent = BRIDGE_TEXT;
    el('start-here', HTMLAnchorElement).href = CLIENT_CONFIG.bridge.startHereUrl;
    el('simulator', HTMLAnchorElement).href = CLIENT_CONFIG.bridge.simulatorUrl;
  }

  // Called every frame with the newest state and the recap of the match just ended (null
  // while a match runs); fills the tables once per recap, ticks the time to the next match.
  update(
    s: ServerState | undefined,
    resultShown: boolean,
    ownId: number | null,
    recap: ServerRecap | null,
  ): void {
    this.root.hidden = !resultShown || !s || !recap;
    if (!resultShown || !s || !recap) {
      this.shown = null;
      return;
    }
    this.next.textContent = `Next match in ${mmss(s.nextMatchMs)}`;
    if (this.shown === recap) return;
    this.shown = recap;
    this.fill(recap, (ghost) => nameIn(s, ghost, ownId), { ownId, unit: modeWords(s.mode).unit });
  }

  private fill(
    r: ServerRecap,
    name: (ghost: number) => string,
    me: { ownId: number | null; unit: string },
  ): void {
    const lines = awardLines(r, name);
    this.awardsBox.hidden = lines.length === 0;
    this.awards.replaceChildren(...lines.map(([label, text]) => row(label, text)));
    const order = [0, 1, 2, 3].sort((a, b) => (r.teams[b] ?? 0) - (r.teams[a] ?? 0));
    this.teams.replaceChildren(
      ...order.map((team, i) =>
        row(`${i + 1}. ${seasonName(team)}`, String(r.teams[team] ?? 0), seasonColour(team)),
      ),
    );
    const ranked = [...r.players].sort((a, b) => b.score - a.score || a.ghost - b.ghost);
    this.players.replaceChildren(
      ...ranked
        .slice(0, SHOWN_PLAYERS)
        .map((p, i) => row(`${i + 1}. ${name(p.ghost)}`, String(p.score), seasonColour(p.team))),
    );
    const own = ranked.findIndex((p) => p.ghost === me.ownId);
    this.place.hidden = own === -1;
    if (own !== -1) {
      const p = ranked[own];
      this.place.textContent = `Your place: ${own + 1} of ${ranked.length} — ${p?.score ?? 0} ${me.unit}`;
    }
  }
}

// Each award kind's title and how its value reads (game-core recap.ts); a kind this client
// does not know is not shown.
const AWARDS: Record<string, [string, (value: number) => string]> = {
  'best-pusher': ['Best pusher', (v) => `${v} knockouts`],
  survivor: ['Survivor', (v) => `${mmss(v)} without a fall`],
  king: ['King', (v) => `${v} s in the zone`],
  bouncer: ['Bouncer', (v) => `${v} pushed out of the zone`],
  'hot-hands': ['Hot hands', (v) => `${v} bombs passed`],
  'cool-head': ['Cool head', (v) => `${v} points`],
};

// The awards the match earned, short enough for a phone; none earned, none shown.
function awardLines(r: ServerRecap, name: (ghost: number) => string): [string, string][] {
  const lines: [string, string][] = [];
  for (const a of r.awards) {
    const known = AWARDS[a.kind];
    if (known) lines.push([known[0], `${name(a.ghost)}, ${known[1](a.value)}`]);
  }
  return lines;
}

function row(label: string, amount: string, colour?: string): HTMLElement {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = label;
  if (colour) name.style.color = colour;
  const v = document.createElement('span');
  v.textContent = amount;
  li.append(name, v);
  return li;
}
