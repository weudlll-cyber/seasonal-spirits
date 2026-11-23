// Seasonal Sumo — the band's team line (index.html #team): "You are Team <Season>" with the team's
// colour dot, for players only; its own file so main.ts stays wiring.

import { seasonColour, seasonName } from '@seasonal-spirits/render';
import { el } from './hud.js';
import { OUT_LINE, OUT_SHORT } from './lives.js';
import { backLine, fellLine } from './own-marker.js';

const span = (className: string, text: string): HTMLSpanElement => {
  const s = document.createElement('span');
  s.className = className;
  s.textContent = text;
  return s;
};

export class TeamLine {
  private readonly line = el('team');

  // On a narrow phone "You are " is hidden (styles/hud.css), so the team's name is never cut off.
  // While the own ghost is out after a fall the line says when it is back (FIX 2026-11-17-3) —
  // the whole line and a short one, the phone showing the short (review 2026-11-22); out of
  // lives, that it watches until the next match (LIVES 2026-11-17), the same two forms (D16).
  show(team: number | null, backInMs: number | null, out: boolean): void {
    const line = this.line;
    line.hidden = team === null;
    if (team !== null && (out || backInMs !== null)) {
      const text = out ? OUT_LINE : fellLine(backInMs ?? 0);
      delete line.dataset.team;
      if (line.dataset.line === text) return; // the same second: nothing to redraw
      line.dataset.line = text;
      const short = out ? OUT_SHORT : backLine(backInMs ?? 0);
      line.replaceChildren(span('long', text), span('short', short));
      line.style.setProperty('--team', seasonColour(team));
      return;
    }
    if (team === null || line.dataset.team === String(team)) return;
    delete line.dataset.line;
    line.replaceChildren(span('lead', 'You are '), `Team ${seasonName(team)}`);
    line.style.setProperty('--team', seasonColour(team));
    line.dataset.team = String(team);
  }
}
