// Seasonal Sumo — the match server's game side: 32 slots, who steers each, match after match,
// and each match's game mode: the modes given take turns (development: sumo → hill → bomb →
// sumo …). Every slot holds a ghost; a bot steers it until a player joins, and again when a
// player has been gone for reconnectGraceMs. The game core decides everything; this file only
// routes intents in (wire.ts turns the core's state into the wire state).

import {
  Match,
  botRoster,
  botSeed,
  createBot,
  modeConfig,
  type Bot,
  type GameConfig,
  type GameMode,
  type Intent,
  type MatchEvent,
  type Roster,
  type TunedFields,
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
  private readonly base: GameConfig;
  private readonly modes: readonly GameMode[];
  private cfg: GameConfig; // of the running match: the base with its mode's times
  private matchNumber = 0;
  private readonly roster: Roster[];
  private readonly control = new Map<number, Controller>();
  private match: Match;
  private seed: number;
  private hostMs = 0;
  private resultUntil: number | null = null;
  private lastEvents: readonly MatchEvent[] = []; // of the tick just run
  private recap: ServerRecap | null = null; // of the match just ended, during the result pause

  // `modes` take turns match by match; the base config's own mode alone by default.
  constructor(base: GameConfig, slots: number, firstSeed: number, modes?: readonly GameMode[]) {
    this.base = { ...base }; // its own copy: the live tuning changes it in place (tune)
    this.modes = modes && modes.length > 0 ? modes : [base.mode];
    this.cfg = this.configFor(0);
    this.roster = botRoster(slots);
    this.seed = firstSeed;
    this.match = new Match(this.cfg, this.seed, this.roster);
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
    this.match.halt(pick.id);
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

  // The owner's live tuning (development only; server.ts checks who asks): the base, the running
  // match, its rules and its bots all read this one config object, so the change holds from the
  // next tick on and for every later match; the running arena eases to its new size.
  tune(fields: TunedFields): void {
    const factor = fields.arenaRadius / this.base.arenaRadius;
    Object.assign(this.base, fields);
    if (this.cfg !== this.base) Object.assign(this.cfg, fields);
    this.match.rescaleArena(factor);
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
      this.nextMatch();
    }
    const s = this.match.tick(dtMs, this.intents());
    if (s.ended) {
      this.resultUntil = this.hostMs + this.cfg.resultPauseMs;
      this.recap = recapOf(this.match.result());
    }
    this.lastEvents = s.events;
    return this.wire(s.events, s.ended ? this.cfg.resultPauseMs : 0);
  }

  // A new match: the next mode, same slots and players, a fresh seed, everyone back at the
  // start; the bots get the new mode's brain.
  private nextMatch(): void {
    this.resultUntil = null;
    this.recap = null;
    this.seed++;
    this.matchNumber++;
    this.cfg = this.configFor(this.matchNumber);
    this.match = new Match(this.cfg, this.seed, this.roster);
    for (const [ghost, c] of this.control) {
      if (c.kind === 'bot') this.control.set(ghost, this.botFor(ghost));
    }
  }

  // The base config as it is for its own mode (a test may have shortened it), else the base
  // with the mode's own times.
  private configFor(matchNumber: number): GameConfig {
    const mode = this.modes[matchNumber % this.modes.length] ?? this.base.mode;
    return mode === this.base.mode ? this.base : modeConfig(this.base, mode);
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

  // A human-like bot for a seat (game-core bots/human.ts), seeded from the match and the seat.
  private botFor(ghost: number): Controller {
    return { kind: 'bot', bot: createBot(this.cfg, botSeed(this.seed, ghost)) };
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
