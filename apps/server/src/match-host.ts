// Seasonal Spirits — the match server's game side: 32 slots, who steers each, match after match.
// Every slot holds a ghost; a bot steers it until a player joins, and again when a player has
// been gone for reconnectGraceMs. The game core decides everything; this file only routes
// intents in (wire.ts turns the core's state into the wire state).

import {
  Match,
  NO_AWARDS,
  botRoster,
  createBot,
  noteAwards,
  type Awards,
  type Bot,
  type GameConfig,
  type Intent,
  type MatchEvent,
  type Roster,
  type Strategy,
} from '@seasonal-spirits/game-core';
import type { GameAction, ServerRecap } from '@seasonal-spirits/protocol';
import { recapOf } from './recap.js';
import { toWire, type WireState } from './wire.js';

export type { WireState } from './wire.js';

type Controller =
  | { kind: 'bot'; bot: Bot }
  | { kind: 'player'; clientId: number; dx: number; dy: number; action: GameAction | null }
  | { kind: 'standing'; since: number }; // a player left; the ghost waits for the grace time

export class MatchHost {
  private readonly cfg: GameConfig;
  private readonly roster: (Roster & { strategy: Strategy })[];
  private readonly control = new Map<number, Controller>();
  private match: Match;
  private seed: number;
  private hostMs = 0;
  private resultUntil: number | null = null;
  private lastEvents: readonly MatchEvent[] = []; // of the tick just run
  private awards: Awards = NO_AWARDS; // of the running match, folded tick by tick
  private recap: ServerRecap | null = null; // of the match just ended, during the result pause

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
      if (this.hostMs < this.resultUntil) {
        this.lastEvents = [];
        return this.wire(this.lastEvents, this.resultUntil - this.hostMs);
      }
      // A new match: same slots and players, a fresh seed, everyone back at the shrines.
      this.resultUntil = null;
      this.recap = null;
      this.awards = NO_AWARDS;
      this.seed++;
      this.match = new Match(this.cfg, this.seed, this.roster);
    }
    const s = this.match.tick(dtMs, this.intents());
    this.awards = noteAwards(this.awards, s);
    if (s.ended) {
      this.resultUntil = this.hostMs + this.cfg.resultPauseMs;
      this.recap = recapOf(this.match.result(), this.awards);
    }
    this.lastEvents = s.events;
    return this.wire(s.events, s.ended ? this.cfg.resultPauseMs : 0);
  }

  // The match recap for every client: `fresh` only in the tick the match ended (sent to all);
  // otherwise the one of the result pause, for a client that arrives during it; null while a
  // match runs.
  recapNow(fresh: boolean): ServerRecap | null {
    if (fresh) return this.lastEvents.some((e) => e.type === 'match-end') ? this.recap : null;
    return this.recap;
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

  // `events` are those of the tick just run: during the result pause the match does not tick
  // and its last events must not be sent again.
  private wire(events: readonly MatchEvent[], nextMatchMs: number): WireState {
    return toWire(this.match.state, {
      cfg: this.cfg,
      result: this.match.result(),
      isBot: (ghost) => this.control.get(ghost)?.kind === 'bot',
      events,
      nextMatchMs,
    });
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
