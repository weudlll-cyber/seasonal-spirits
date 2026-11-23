// Seasonal Sumo — the result screen after a match: the mode's awards and scores per team and
// player, the own place and next match, the podium and the bridge box (CONCEPT.md §8, config.ts).
// Fills the kit's result frame (frame/ResultCard.tsx) by id from the server's recap and state.

import {
  GHOST_BOT,
  STATE_LAST_STANDING,
  ghostName,
  type ServerRecap,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  drawPodium,
  mmss,
  modeOf,
  modeWords,
  seasonColour,
  seasonName,
  type ModeWords,
} from '@seasonal-spirits/render';
import { BRIDGE_TEXTS, CLIENT_CONFIG } from './config.js';
import { resultFilled } from './frame/frame-store.js';
import { el } from './hud.js';

const SHOWN_PLAYERS = 8;

// A ghost as every screen names it: "You" for the own one, else "Bot 7" or "Player 7".
function nameIn(s: ServerState | undefined, ghost: number, ownId: number | null): string {
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
  private readonly bridgeText = el('bridge-text');
  private readonly podium = el('podium', HTMLCanvasElement).getContext('2d');
  private shown: ServerRecap | null = null; // the recap on screen
  private shownAt = 0; // when it came on screen: the confetti's start
  private order: number[] = []; // the teams, best first

  constructor() {
    const bridge = el('bridge');
    bridge.hidden = !CLIENT_CONFIG.bridge.enabled;
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
    this.bridgeText.textContent = BRIDGE_TEXTS[modeOf(s.mode)];
    this.fill(recap, (ghost) => nameIn(s, ghost, ownId), {
      ownId,
      unit: modeWords(s.mode).unit,
      lastStanding: (s.flags & STATE_LAST_STANDING) !== 0,
    });
    resultFilled();
  }

  private fill(
    r: ServerRecap,
    name: (ghost: number) => string,
    me: { ownId: number | null; unit: ModeWords['unit']; lastStanding: boolean },
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
        .map((p, i) =>
          row(`${i + 1}. ${name(p.ghost)}`, playerText(p, me.lastStanding), seasonColour(p.team)),
        ),
    );
    const own = ranked.findIndex((p) => p.ghost === me.ownId);
    this.place.hidden = own === -1;
    const p = ranked[own];
    if (p) {
      const text = me.lastStanding
        ? playerText(p, true)
        : counted(p.score, me.unit.one, me.unit.many);
      this.place.textContent = `Your place: ${own + 1} of ${ranked.length} — ${text}`;
    }
  }
}

// A player's amount in the list: in Last One Standing when it went out — "out at 1:42" in match
// time, "still in" — (owner 2026-11-20: the knockouts beside the survival order read as unsorted;
// they stay in the awards), else its score.
export function playerText(p: ServerRecap['players'][number], lastStanding: boolean): string {
  if (!lastStanding) return String(p.score);
  return p.outMs === null ? 'still in' : `out at ${mmss(p.outMs)}`;
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
  'best-pusher': ['Best pusher', (v) => counted(v, 'knockout', 'knockouts')],
  survivor: ['Survivor', (v) => `${mmss(v)} without a fall`],
  king: ['King', (v) => `${v} s in the zone`],
  bouncer: ['Bouncer', (v) => `${v} pushed out of the zone`],
  'hot-hands': ['Hot hands', (v) => counted(v, 'bomb passed', 'bombs passed')],
  'cool-head': ['Cool head', (v) => counted(v, 'point', 'points')],
};

// The awards the match earned, short enough for a phone; none earned, none shown.
export function awardLines(r: ServerRecap, name: (ghost: number) => string): [string, string][] {
  const lines: [string, string][] = [];
  for (const a of r.awards) {
    const known = AWARDS[a.kind];
    if (known) lines.push([known[0], `${name(a.ghost)}, ${known[1](a.value)}`]);
  }
  return lines;
}

// "1 knockout", "8 knockouts" (review 2026-11-20: the result said "1 knockouts").
export function counted(n: number, one: string, many: string): string {
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
