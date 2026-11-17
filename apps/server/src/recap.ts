// Seasonal Sumo — the match recap as the message every client gets when a match ends: the
// core's result — the mode's score per team and player — and the mode's awards (game-core
// recap.ts). An award nobody earned is left out; the client names the ghosts.

import { awardsOf, type MatchResult } from '@seasonal-spirits/game-core';
import type { ServerRecap } from '@seasonal-spirits/protocol';

export function recapOf(result: MatchResult): ServerRecap {
  const t = result.teams;
  return {
    kind: 'recap',
    teams: [t[0] ?? 0, t[1] ?? 0, t[2] ?? 0, t[3] ?? 0],
    players: result.players.map((p) => ({ ghost: p.id, team: p.team, score: p.score })),
    awards: awardsOf(result).map((a) => ({ ...a, value: Math.round(a.value) })),
  };
}
