// Seasonal Sumo — the match recap as the message every client gets when a match ends: the
// core's result and the awards ("Best pusher" folded from the match, "Survivor" from the
// result; game-core recap.ts). An award nobody earned is left out; the client names the ghosts.

import { survivorOf, type Awards, type MatchResult } from '@seasonal-spirits/game-core';
import type { ServerRecap } from '@seasonal-spirits/protocol';

export function recapOf(result: MatchResult, awards: Awards): ServerRecap {
  const t = result.teams;
  const out: ServerRecap = {
    kind: 'recap',
    teams: [t[0] ?? 0, t[1] ?? 0, t[2] ?? 0, t[3] ?? 0],
    players: result.players.map((p) => ({ ghost: p.id, team: p.team, knockouts: p.knockouts })),
    awards: {},
  };
  if (awards.bestPusher) out.awards.bestPusher = awards.bestPusher;
  const survivor = survivorOf(result);
  if (survivor) out.awards.survivor = { ghost: survivor.ghost, ms: Math.round(survivor.ms) };
  return out;
}
