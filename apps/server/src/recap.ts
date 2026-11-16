// Seasonal Spirits — the match recap as the message every client gets when a match ends: the
// core's result and the awards the core folded from the match (game-core recap.ts). An award
// nobody earned is left out; the client names the ghosts.

import type { Awards, MatchResult } from '@seasonal-spirits/game-core';
import type { ServerRecap } from '@seasonal-spirits/protocol';

export function recapOf(result: MatchResult, awards: Awards): ServerRecap {
  const t = result.teams;
  const out: ServerRecap = {
    kind: 'recap',
    teams: [t[0] ?? 0, t[1] ?? 0, t[2] ?? 0, t[3] ?? 0],
    players: result.players.map((p) => ({ ghost: p.id, team: p.team, secured: p.secured })),
    awards: {},
  };
  if (awards.closestSave) out.awards.closestSave = awards.closestSave;
  if (awards.lastSecure) out.awards.lastSecure = awards.lastSecure;
  return out;
}
