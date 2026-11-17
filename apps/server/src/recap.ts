// Seasonal Sumo — the match recap as the message every client gets when a match ends: the
// core's result — the mode's score per team and player, the ghosts still in per team, the teams
// knocked out in order, Last One Standing's winner — and the mode's awards (game-core recap.ts).
// An award nobody earned is left out; the client names the ghosts.

import { awardsOf, type MatchResult } from '@seasonal-spirits/game-core';
import type { ServerRecap } from '@seasonal-spirits/protocol';

export function recapOf(result: MatchResult): ServerRecap {
  const four = (t: readonly number[]): [number, number, number, number] => [
    t[0] ?? 0,
    t[1] ?? 0,
    t[2] ?? 0,
    t[3] ?? 0,
  ];
  return {
    kind: 'recap',
    teams: four(result.teams),
    left: four(result.left),
    knockedOut: [...result.knockedOut],
    winner: result.winner,
    players: result.players.map((p) => ({ ghost: p.id, team: p.team, score: p.score })),
    awards: awardsOf(result).map((a) => ({ ...a, value: Math.round(a.value) })),
  };
}
