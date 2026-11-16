// Seasonal Sumo — the team scores in the band (the price board's place in Seasonal Spirits):
// the four teams in their order, each in its colour with its knockouts, the leader framed.

import type { ServerState } from '@seasonal-spirits/protocol';
import { SEASON_NAMES, seasonColour } from '@seasonal-spirits/render';
import { el } from './hud.js';

export class ScoreBoard {
  private readonly root = el('scores');
  private readonly chips: HTMLElement[];
  private shown = ''; // the scores the chips show

  constructor() {
    this.chips = SEASON_NAMES.map((_, team) => {
      const chip = document.createElement('span');
      chip.className = 'score';
      chip.style.color = seasonColour(team);
      return chip;
    });
    this.root.append(...this.chips);
  }

  // Called every frame with the newest state (undefined before the first).
  update(s: ServerState | undefined): void {
    this.root.hidden = s === undefined;
    if (!s || s.teamScore.join() === this.shown) return;
    this.shown = s.teamScore.join();
    const top = Math.max(...s.teamScore);
    this.chips.forEach((chip, team) => {
      const n = s.teamScore[team] ?? 0;
      chip.textContent = `${SEASON_NAMES[team] ?? ''} ${n}`;
      chip.classList.toggle('lead', top > 0 && n === top);
    });
  }
}
