// Seasonal Spirits — the match server's game side: 32 slots, who steers each, match after match.
// Every slot holds a ghost; a bot steers it until a player joins, and again when a player has
// been gone for reconnectGraceMs. The game core decides everything; this file only routes
// intents in and turns the core's state into the wire state.

import {
  Match,
  SEASONS,
  botRoster,
  createBot,
  totalCount,
  type Bot,
  type GameConfig,
  type Intent,
  type MatchState,
  type Roster,
  type Strategy,
} from '@seasonal-spirits/game-core';
import {
  GHOST_BOT,
  GHOST_CARRIER,
  GHOST_SECURING,
  STATE_HALVING_DONE,
  STATE_HALVING_EVENT,
  STATE_RESULT,
  type GameAction,
  type ServerState,
} from '@seasonal-spirits/protocol';

type Controller =
  | { kind: 'bot'; bot: Bot }
  | { kind: 'player'; clientId: number; dx: number; dy: number; action: GameAction | null }
  | { kind: 'standing'; since: number }; // a player left; the ghost waits for the grace time

export type WireState = Omit<ServerState, 'tick' | 'serverMs'>;

export class MatchHost {
  private readonly cfg: GameConfig;
  private readonly roster: (Roster & { strategy: Strategy })[];
  private readonly control = new Map<number, Controller>();
  private match: Match;
  private seed: number;
  private hostMs = 0;
  private resultUntil: number | null = null;

  constructor(cfg: GameConfig, slots: number, firstSeed: number) {
    this.cfg = cfg;
    this.roster = botRoster(slots);
    this.seed = firstSeed;
    this.match = new Match(cfg, this.seed, this.roster);
    for (const r of this.roster) this.control.set(r.id, this.botFor(r.id));
  }

  // A joining player replaces a bot on the team with the fewest players; null when every
  // slot is a player or a standing ghost.
  join(clientId: number): { ghost: number; team: number } | null {
    const taken = this.takenPerTeam();
    let pick: Roster | null = null;
    for (const r of this.roster) {
      if (this.control.get(r.id)?.kind !== 'bot') continue;
      if (!pick || (taken[r.team] ?? 0) < (taken[pick.team] ?? 0)) pick = r;
    }
    if (!pick) return null;
    this.control.set(pick.id, { kind: 'player', clientId, dx: 0, dy: 0, action: null });
    return { ghost: pick.id, team: pick.team };
  }

  leave(clientId: number): void {
    const ghost = this.ghostOf(clientId);
    if (ghost !== null) this.control.set(ghost, { kind: 'standing', since: this.hostMs });
  }

  steer(clientId: number, dx: number, dy: number): void {
    const c = this.playerControl(clientId);
    if (c) {
      c.dx = dx;
      c.dy = dy;
    }
  }

  // One action per tick: the latest one before the tick wins, and it is used once.
  act(clientId: number, action: GameAction): void {
    const c = this.playerControl(clientId);
    if (c) c.action = action;
  }

  players(): number {
    return [...this.control.values()].filter((c) => c.kind === 'player').length;
  }

  tick(dtMs: number): WireState {
    this.hostMs += dtMs;
    for (const [ghost, c] of this.control) {
      if (c.kind === 'standing' && this.hostMs - c.since >= this.cfg.reconnectGraceMs) {
        this.control.set(ghost, this.botFor(ghost));
      }
    }
    if (this.resultUntil !== null) {
      if (this.hostMs < this.resultUntil) return this.wire(this.match.state, false);
      // A new match: same slots and players, a fresh seed, everyone back at the shrines.
      this.resultUntil = null;
      this.seed++;
      this.match = new Match(this.cfg, this.seed, this.roster);
    }
    const s = this.match.tick(dtMs, this.intents());
    if (s.ended) this.resultUntil = this.hostMs + this.cfg.resultPauseMs;
    return this.wire(
      s,
      s.events.some((e) => e.type === 'halving'),
    );
  }

  private intents(): Map<number, Intent> {
    const s = this.match.state;
    const out = new Map<number, Intent>();
    for (const g of s.ghosts) {
      const c = this.control.get(g.id);
      if (c?.kind === 'bot') out.set(g.id, c.bot(s, g));
      if (c?.kind === 'player') {
        out.set(g.id, c.action ? { dx: c.dx, dy: c.dy, action: c.action } : { dx: c.dx, dy: c.dy });
        c.action = null;
      }
    }
    return out;
  }

  private wire(s: Readonly<MatchState>, halvingEvent: boolean): WireState {
    const teams = this.match.result().teams;
    return {
      matchMs: s.elapsedMs,
      season: SEASONS.indexOf(s.clock.current),
      seasonLeftMs: s.clock.timeLeftMs,
      countdownMs: s.halvingCountdownMs,
      flags:
        (halvingEvent ? STATE_HALVING_EVENT : 0) |
        (s.halvingDone ? STATE_HALVING_DONE : 0) |
        (s.ended ? STATE_RESULT : 0),
      pool: [s.pool.spring, s.pool.summer, s.pool.autumn, s.pool.winter],
      teamSecured: [teams[0] ?? 0, teams[1] ?? 0, teams[2] ?? 0, teams[3] ?? 0],
      ghosts: s.ghosts.map((g) => {
        const carried = totalCount(g.carried);
        return {
          id: g.id,
          x: g.x,
          y: g.y,
          team: g.team,
          carried,
          flags:
            (carried > 0 ? GHOST_CARRIER : 0) |
            (g.securingUntilMs !== null ? GHOST_SECURING : 0) |
            (this.control.get(g.id)?.kind === 'bot' ? GHOST_BOT : 0),
        };
      }),
      coins: s.coins.map((c) => ({ x: c.x, y: c.y })),
    };
  }

  // Slots per team held by a player or a standing ghost.
  private takenPerTeam(): number[] {
    const taken = [0, 0, 0, 0];
    for (const r of this.roster) {
      if (this.control.get(r.id)?.kind !== 'bot') taken[r.team] = (taken[r.team] ?? 0) + 1;
    }
    return taken;
  }

  private botFor(ghost: number): Controller {
    const strategy = this.roster.find((r) => r.id === ghost)?.strategy ?? 'patient';
    return { kind: 'bot', bot: createBot(this.cfg, strategy) };
  }

  private ghostOf(clientId: number): number | null {
    for (const [ghost, c] of this.control) {
      if (c.kind === 'player' && c.clientId === clientId) return ghost;
    }
    return null;
  }

  private playerControl(clientId: number): Extract<Controller, { kind: 'player' }> | null {
    const ghost = this.ghostOf(clientId);
    const c = ghost === null ? undefined : this.control.get(ghost);
    return c?.kind === 'player' ? c : null;
  }
}
