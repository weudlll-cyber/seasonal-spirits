// Seasonal Spirits — the game core's match state as the wire state every client receives.
// One place turns the core's numbers into what clients show: per ghost the carried and
// off-season counts and the secured value, and for players in their own shrine the two
// button offers, computed by the core (a client never calculates them).

import {
  SEASONS,
  atOwnShrine,
  shrineOffer,
  totalCount,
  type GameConfig,
  type Ghost,
  type MatchResult,
  type MatchState,
} from '@seasonal-spirits/game-core';
import {
  GHOST_AT_SHRINE,
  GHOST_BOT,
  GHOST_CARRIER,
  GHOST_SECURING,
  STATE_HALVING_EVENT,
  STATE_RESULT,
  type GhostState,
  type OfferState,
  type ServerState,
} from '@seasonal-spirits/protocol';

export type WireState = Omit<ServerState, 'tick' | 'serverMs'>;

export interface WireContext {
  cfg: GameConfig;
  result: MatchResult;
  isBot: (ghost: number) => boolean;
  halvingEvent: boolean;
  nextMatchMs: number; // 0 outside the result pause
}

export function toWire(s: Readonly<MatchState>, ctx: WireContext): WireState {
  const teams = ctx.result.teams;
  const offers: OfferState[] = [];
  const ghosts = s.ghosts.map((g) => {
    const wire = ghostOnWire(ctx, s, g);
    // Bots read the core state directly; only players need the button numbers.
    if (wire.flags & GHOST_AT_SHRINE && !(wire.flags & GHOST_BOT) && !s.ended) {
      offers.push({ ghost: g.id, ...shrineOffer(ctx.cfg, s, g) });
    }
    return wire;
  });
  return {
    matchMs: s.elapsedMs,
    season: SEASONS.indexOf(s.clock.current),
    seasonNumber: s.clock.index,
    seasonLeftMs: s.clock.timeLeftMs,
    countdownMs: s.halvingCountdownMs,
    flags: (ctx.halvingEvent ? STATE_HALVING_EVENT : 0) | (s.ended ? STATE_RESULT : 0),
    nextMatchMs: ctx.nextMatchMs,
    teamSecured: [teams[0] ?? 0, teams[1] ?? 0, teams[2] ?? 0, teams[3] ?? 0],
    ghosts,
    coins: s.coins.map((c) => ({ x: c.x, y: c.y })),
    offers,
  };
}

function ghostOnWire(ctx: WireContext, s: Readonly<MatchState>, g: Ghost): GhostState {
  const carried = totalCount(g.carried);
  return {
    id: g.id,
    x: g.x,
    y: g.y,
    team: g.team,
    carried,
    offSeason: carried - g.carried[s.clock.current],
    secured: g.securedValue,
    flags:
      (carried > 0 ? GHOST_CARRIER : 0) |
      (g.securingUntilMs !== null ? GHOST_SECURING : 0) |
      (ctx.isBot(g.id) ? GHOST_BOT : 0) |
      (atOwnShrine(ctx.cfg, s, g) ? GHOST_AT_SHRINE : 0),
  };
}
