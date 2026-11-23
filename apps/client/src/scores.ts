// Seasonal Sumo — the team scores in the band: per team a pill with its colour dot and score (in
// sumo also its ghosts still in; in Last One Standing only those), the leader outlined.

import { STATE_LAST_STANDING, type ServerState } from '@seasonal-spirits/protocol';
import { SEASON_NAMES, modeOf, seasonColour } from '@seasonal-spirits/render';
import { el } from './hud.js';

// One chip's numbers and the one that leads: "3 · 7 in" (Points), "7 in" (Last One Standing),
// "3" (the walled modes); the team's name goes before them.
export function chipOf(s: ServerState, team: number): { text: string; rank: number } {
  const score = s.teamScore[team] ?? 0;
  if (modeOf(s.mode) !== 'sumo') return { text: String(score), rank: score };
  const left = s.ghosts.filter((g) => g.team === team && g.lives > 0).length;
  if (s.flags & STATE_LAST_STANDING) return { text: `${String(left)} in`, rank: left };
  return { text: `${String(score)} · ${String(left)} in`, rank: score };
}

export class ScoreBoard {
  private readonly root = el('scores');
  private readonly chips: HTMLElement[];
  private shown = ''; // the scores the chips show

  constructor() {
    this.chips = SEASON_NAMES.map((_, team) => {
      const chip = document.createElement('span');
      chip.className = 'score dot';
      chip.style.setProperty('--team', seasonColour(team));
      return chip;
    });
    this.root.append(...this.chips);
  }

  // Called every frame with the newest state (undefined before the first).
  update(s: ServerState | undefined): void {
    this.root.hidden = s === undefined;
    if (!s) return;
    const chips = this.chips.map((_, team) => chipOf(s, team));
    const shown = chips.map((c) => c.text).join();
    if (shown === this.shown) return;
    this.shown = shown;
    const top = Math.max(...chips.map((c) => c.rank));
    this.chips.forEach((chip, team) => {
      const c = chips[team];
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = `${SEASON_NAMES[team] ?? ''} `;
      chip.replaceChildren(name, c?.text ?? '');
      chip.classList.toggle('lead', top > 0 && c?.rank === top);
    });
  }
}
