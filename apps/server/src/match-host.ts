// Seasonal Sumo — the match server's game side: the seats, who steers each, match after match,
// and each match's mode and sumo variant from the rotation (settings rotation1…6; "alternate"
// takes Points and Last One Standing in turn) — or the game the admin panel started, kept for
// the following matches while its "keep playing" switch is on. Every number comes from the settings (game-core
// settings.ts, NIGHT 2026-11-18): those that apply at once reach the running match on a change
// (tune), the rest wait for the next match. Every seat holds a ghost; a bot steers it until a
// player joins, and again when a player has been gone for reconnectGraceMs. Seats are filled at a
// match's start only (teamSize per team): a ghost out of lives stays out until the next match.
// The game core decides everything; this file only routes intents in (wire.ts turns the core's
// state into the wire state).

import {
  Match,
  botRoster,
  botSeed,
  configFrom,
  createBot,
  nowPart,
  rotationOf,
  type Bot,
  type GameConfig,
  type Intent,
  type MatchEvent,
  type Roster,
  type RotationSlot,
  type Settings,
} from '@seasonal-spirits/game-core';
import type { GameAction, ServerRecap } from '@seasonal-spirits/protocol';
import { NextGame } from './next-game.js';
import { recapOf } from './recap.js';
import { refresh } from './refresh.js';
import { toWire, type WireState } from './wire.js';

export type { WireState } from './wire.js';

type Controller =
  | { kind: 'bot'; bot: Bot }
  | { kind: 'player'; clientId: number; dx: number; dy: number; action: GameAction | null }
  | { kind: 'standing'; since: number }; // a player left; the ghost waits for the grace time

export class MatchHost {
  private wanted: Settings; // the latest settings: the next match starts with them
  private running: Settings; // the running match's: its start's, with the at-once changes
  private cfg: GameConfig; // the running match's config, built from `running`
  private matchNumber = 0;
  private roster: Roster[] = [];
  private readonly control = new Map<number, Controller>();
  private match: Match;
  private seed: number;
  private hostMs = 0;
  private resultUntil: number | null = null;
  private lastEvents: readonly MatchEvent[] = []; // of the tick just run
  private recap: ServerRecap | null = null; // of the match just ended, during the result pause
  private told = false; // the clients know the running settings
  private game: RotationSlot = { mode: 'sumo', variant: 'points' }; // the running match's
  private readonly next = new NextGame(); // the rotation's, or the game the admin panel started

  constructor(settings: Settings, firstSeed: number) {
    this.wanted = settings;
    this.running = settings;
    this.seed = firstSeed;
    this.cfg = configFrom(settings, rotationOf(settings)[0]?.mode ?? 'sumo');
    this.match = this.newMatch();
  }

  // A joining player replaces a bot on the team with the fewest players — a bot whose ghost
  // still has lives when there is one (else the player watches until the next match); null
  // when every seat is a player or a standing ghost.
  join(clientId: number): { ghost: number; team: number } | null {
    const taken = this.takenPerTeam();
    const bots = this.roster.filter((r) => this.control.get(r.id)?.kind === 'bot');
    const alive = bots.filter(
      (r) => (this.match.state.ghosts.find((g) => g.id === r.id)?.lives ?? 0) > 0,
    );
    let pick: Roster | null = null;
    for (const r of alive.length > 0 ? alive : bots) {
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

  // One action per tick, Dash or Jump: the latest one before the tick wins, and it is used once
  // (the core ignores a jump with the switch off or in its cooldown).
  act(clientId: number, action: GameAction): void {
    const c = this.playerControl(clientId);
    if (c) c.action = action;
  }

  // New settings (the admin panel; server.ts checks who asks — the caller has validated them):
  // the next match starts with all of them; the running match takes those that apply at once,
  // its arena easing to a new size, its bots rebuilt with the new numbers.
  tune(settings: Settings): void {
    this.wanted = settings;
    const before = this.running;
    this.running = nowPart(before, settings);
    refresh(
      this.cfg as unknown as Record<string, unknown>,
      configFrom(this.running, this.cfg.mode) as unknown as Record<string, unknown>,
    );
    if (this.running.arenaRadius !== before.arenaRadius) {
      this.match.rescaleArena(this.running.arenaRadius / before.arenaRadius);
    }
    for (const [ghost, c] of this.control) {
      if (c.kind === 'bot') this.control.set(ghost, this.botFor(ghost));
    }
    this.told = false;
  }

  // The admin panel's "start" (development; server.ts checks who asks, the caller has validated
  // the settings): the running match ends at once — no result pause, no recap — and `game`
  // starts with `settings` through the normal start; afterwards the rotation goes on, unless
  // `keep` holds this game for every following match.
  startGame(game: RotationSlot, settings: Settings, keep: boolean): void {
    this.next.started(game, keep);
    this.wanted = settings;
    this.nextMatch();
  }

  // The "keep playing this game" switch on its own: on holds the running match's game.
  keepGame(on: boolean): void {
    this.next.keepOn(on, this.game);
  }

  keeping(): boolean {
    return this.next.keeping();
  }

  // The settings the clients play by now, once after each change (the tuning message); null
  // when they know them already.
  settingsToTell(): Settings | null {
    if (this.told) return null;
    this.told = true;
    return this.running;
  }

  // The settings in force now: for a client that says hello.
  settingsInForce(): Settings {
    return this.running;
  }

  // The settings the next match starts with: what the admin panel shows.
  settingsWanted(): Settings {
    return this.wanted;
  }

  seats(): number {
    return this.roster.length;
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

  // A new match: the next in the rotation, with the latest settings, a fresh seed, everyone back
  // at the start; the bots get the new mode's brain.
  private nextMatch(): void {
    this.resultUntil = null;
    this.recap = null;
    this.seed++;
    this.matchNumber++;
    this.running = this.wanted;
    this.match = this.newMatch();
  }

  // The match of `running` and this.seed: its game and sumo variant (next-game.ts — the started
  // game, else the rotation's slot for this match number), the seats for the team size.
  private newMatch(): Match {
    const { slot, variant } = this.next.pick(rotationOf(this.running), this.matchNumber);
    this.game = slot;
    this.cfg = configFrom(this.running, slot.mode);
    this.seat(4 * this.running.teamSize);
    this.told = false;
    const match = new Match(this.cfg, this.seed, this.roster, variant);
    // A bot for every seat no player holds: a new one, or the new mode's brain.
    for (const r of this.roster) {
      const c = this.control.get(r.id);
      if (!c || c.kind === 'bot') this.control.set(r.id, this.botFor(r.id));
    }
    return match;
  }

  // `count` seats (slot i is team i mod 4); a seat a player holds, or stands in, is kept even past
  // the count, so nobody loses a ghost when the team size shrinks.
  private seat(count: number): void {
    const held = this.roster.filter((r) => this.control.get(r.id)?.kind !== 'bot');
    const seats = botRoster(count);
    for (const r of held) if (!seats.some((s) => s.id === r.id)) seats.push(r);
    for (const id of this.control.keys()) {
      if (!seats.some((s) => s.id === id)) this.control.delete(id);
    }
    this.roster = seats.sort((a, b) => a.id - b.id);
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

  // Seats per team held by a player or a standing ghost.
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
