// Seasonal Sumo — the result screen after a match: the mode's awards, the mode's score
// (knockouts or points) per team — in Last One Standing the teams in their final order, the
// winner first and then those knocked out, last out first (LIVES 2026-11-17) — and per player,
// the own place, the time to the next match, and the bridge box of CONCEPT.md §8 (on by default,
// switched off in config.ts). Over it a podium on a floating island with the best three teams'
// characters and a confetti burst in the winner's colour (render podium.ts, NIGHT 2026-11-19),
// for every mode. Result and awards come from the server's recap message, the names and the time
// to the next match from the state.

import {
  GHOST_BOT,
  ghostName,
  type ServerRecap,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { drawPodium, mmss, modeWords, seasonColour, seasonName } from '@seasonal-spirits/render';
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
  private readonly podium = el('podium', HTMLCanvasElement).getContext('2d');
  private shown: ServerRecap | null = null; // the recap on screen
  private shownAt = 0; // when it came on screen: the confetti's start
  private order: number[] = []; // the teams, best first

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
    const now = performance.now();
    if (this.podium) drawPodium(this.podium, this.order, { nowMs: now, sinceMs: this.shownAt });
    if (this.shown === recap) return;
    this.shown = recap;
    this.shownAt = now;
    this.order = teamLines(recap).map(([team]) => team);
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
    this.teams.replaceChildren(
      ...teamLines(r).map(([team, text], i) =>
        row(`${i + 1}. ${seasonName(team)}`, text, seasonColour(team)),
      ),
    );
    // The players come in their final places (the server ranks: game-core `ranked`).
    const ranked = r.players;
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

const ORDINALS = ['1st', '2nd', '3rd', '4th'];

// The team table: by score (Points and the walled modes); in Last One Standing (a winner named)
// the winner, the teams still in at the time limit by ghosts left, then the teams knocked out,
// last out first, each with when it went out.
export function teamLines(r: ServerRecap): [number, string][] {
  const teams = [0, 1, 2, 3];
  if (r.winner === null) {
    const order = teams.sort((a, b) => (r.teams[b] ?? 0) - (r.teams[a] ?? 0));
    return order.map((team) => [team, String(r.teams[team] ?? 0)]);
  }
  const winner = r.winner;
  const out = r.knockedOut.filter((t) => t !== winner);
  const stillIn = teams
    .filter((t) => t !== winner && !out.includes(t))
    .sort((a, b) => (r.left[b] ?? 0) - (r.left[a] ?? 0));
  const outText = (t: number): string => `out ${ORDINALS[r.knockedOut.indexOf(t)] ?? ''}`;
  return [
    [winner, 'winner'],
    ...stillIn.map((t): [number, string] => [t, `${String(r.left[t] ?? 0)} still in`]),
    ...out.reverse().map((t): [number, string] => [t, outText(t)]),
  ];
}

// Each award kind's title and how its value reads (game-core recap.ts); a kind this client
// does not know is not shown.
const AWARDS: Record<string, [string, (value: number) => string]> = {
  'last-standing': ['Last one standing', (v) => `${counted(v, 'life', 'lives')} left`],
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

function counted(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

function row(label: string, amount: string, colour?: string): HTMLElement {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = label;
  if (colour) {
    name.className = 'dot';
    name.style.setProperty('--team', colour);
  }
  const v = document.createElement('span');
  v.textContent = amount;
  li.append(name, v);
  return li;
}
