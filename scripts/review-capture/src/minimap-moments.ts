// Seasonal Sumo review capture — which moments the minimap's capture shoots, from the client frame
// by frame: the first seconds, every halving once the walls settle, the last seconds. Pure.

import { DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import { GHOST_OUT } from '@seasonal-spirits/protocol';
import type { ClientView } from '../../../apps/client/e2e/stack.js';

const START_MS = 1500; // "the first seconds"
// After a halving: the walls ease in over the edge's easing (game-core edgeEase), then a little.
const SETTLED_MS = DEFAULT_SETTINGS.edgeEase * 1000 + 500;
const LAST_MS = 3000; // "the last seconds": the clock's countdown to the end below this

export class MinimapDirector {
  private startedAt: number | null = null;
  private started = false;
  private shotHalvings = 0; // the client's halving count when the last one was shot
  private n = 0; // this match's halvings shot
  private halvingAt: number | null = null; // when the halving not yet shot came
  private last = false;
  finished = false; // the last seconds shot, or the match over

  private team: number | null = null;

  // One frame of the player's client at `nowMs`: the moment to shoot now, or null.
  observe(v: ClientView, nowMs: number): string | null {
    // A new team: a new match (the admin's start ends the running one without a result and seats
    // everyone again) — its moments start over.
    if (this.team !== null && v.team !== this.team) this.restart();
    this.team = v.team;
    if (v.result) {
      this.finished = this.startedAt !== null;
      return null;
    }
    if (!v.own || v.own.flags & GHOST_OUT) return null;
    this.startedAt ??= nowMs;
    if (!this.started) return this.start(v, nowMs);
    if (v.countdown?.toEnd && v.countdown.ms <= LAST_MS && !this.last) {
      this.last = true;
      this.finished = true;
      return 'last-seconds';
    }
    return this.halving(v, nowMs);
  }

  // The first seconds: their moment once they have passed.
  private start(v: ClientView, nowMs: number): string | null {
    if (nowMs - (this.startedAt ?? nowMs) < START_MS) return null;
    this.started = true;
    this.shotHalvings = v.halvings; // halvings before the match's first frame are not its own
    return 'start';
  }

  // A halving not yet shot: its moment once the walls have settled.
  private halving(v: ClientView, nowMs: number): string | null {
    if (v.halvings <= this.shotHalvings) return null;
    this.halvingAt ??= nowMs;
    if (nowMs - this.halvingAt < SETTLED_MS) return null;
    this.shotHalvings = v.halvings;
    this.halvingAt = null;
    return `halving-${String(++this.n)}`;
  }

  private restart(): void {
    Object.assign(this, { startedAt: null, started: false, n: 0, halvingAt: null, last: false });
  }
}
