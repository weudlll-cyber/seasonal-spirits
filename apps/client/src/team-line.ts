// Seasonal Sumo — the band's team line (index.html #team): "You are Team <Season>" behind the
// team's colour dot, for players only (owner's play test 2026-11-15). Its own file so main.ts
// stays one concern: wiring the client together.

import { seasonColour, seasonName } from '@seasonal-spirits/render';
import { el } from './hud.js';
import { OUT_LINE } from './lives.js';
import { fellLine } from './own-marker.js';

export class TeamLine {
  private readonly line = el('team');

  // On a narrow phone "You are " is hidden (index.html), so the team's name is never cut off.
  // While the own ghost is out after a fall the line says when it is back (FIX 2026-11-17-3);
  // out of lives, that it watches until the next match (LIVES 2026-11-17).
  show(team: number | null, backInMs: number | null, out: boolean): void {
    const line = this.line;
    line.hidden = team === null;
    if (team !== null && (out || backInMs !== null)) {
      line.textContent = out ? OUT_LINE : fellLine(backInMs ?? 0);
      line.style.setProperty('--team', seasonColour(team));
      delete line.dataset.team;
      return;
    }
    if (team === null || line.dataset.team === String(team)) return;
    const lead = document.createElement('span');
    lead.className = 'lead';
    lead.textContent = 'You are ';
    line.replaceChildren(lead, `Team ${seasonName(team)}`);
    line.style.setProperty('--team', seasonColour(team));
    line.dataset.team = String(team);
  }
}
