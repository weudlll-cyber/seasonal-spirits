// Seasonal Sumo review capture — which moments the own marker's capture shoots (owner 2026-11-20:
// is the own character found at a glance where it is densest?), read from the player's client
// frame by frame: the match's first seconds, then once in every season the mode's densest moment
// — Sumo a crowd round the own character, King the own one in a full zone, Bomb the own one
// carrying a bomb in a crowd — or, when none came, the season's last seconds. Pure: the clock
// comes in.

import { GHOST_BOMB, GHOST_OUT } from '@seasonal-spirits/protocol';
import type { ClientView } from '../../../apps/client/e2e/stack.js';
import { inZone } from './moments.js';

const FIRST_MS = 1500; // "the first seconds"
const NEAR_RADII = 5; // others this many body radii from the own one stand in its crowd
const CROWD = { sumo: 5, hill: 4, bomb: 3 } as const; // how many make a crowd, per mode
const LATE_MS = 2500; // a season with no crowd is shot this long before it ends
const SEASONS = 4;

// How many others stand within NEAR_RADII of the own character on screen.
export function crowdAround(v: ClientView): number {
  const me = v.ghostsShown.find((g) => g.id === v.ghost);
  if (!me) return 0;
  const near = (g: { id: number; x: number; y: number }): boolean =>
    g.id !== me.id && Math.hypot(g.x - me.x, g.y - me.y) < NEAR_RADII * me.r;
  return v.ghostsShown.filter(near).length;
}

// The mode's moment when the frame shows it, null otherwise.
function densest(v: ClientView): string | null {
  const mode = v.gameMode;
  if (!mode || crowdAround(v) < CROWD[mode]) return null;
  if (mode === 'hill') return inZone(v) ? 'full-zone' : null;
  if (mode === 'bomb') return (v.own?.flags ?? 0) & GHOST_BOMB ? 'carrying-bomb-crowd' : null;
  return 'crowd';
}

export class OwnDirector {
  private startedAt: number | null = null;
  private first = false;
  private readonly seasons = new Set<number>();
  finished = false; // every season shot, or the match over

  // One frame of the player's client at `nowMs`: the moment to shoot now, or null.
  observe(v: ClientView, nowMs: number): string | null {
    if (v.result) {
      this.finished = this.startedAt !== null;
      return null;
    }
    if (!v.own || v.own.flags & GHOST_OUT) return null;
    if (!this.first) return this.firstSeconds(nowMs);
    const season = (v.season ?? 0) + 1;
    if (this.seasons.has(season)) return null;
    const moment = densest(v);
    const late = v.countdown !== null && v.countdown.ms <= LATE_MS;
    if (!moment && !late) return null;
    this.seasons.add(season);
    this.finished = this.seasons.size === SEASONS;
    return `season-${String(season)}-${moment ?? 'late'}`;
  }

  // Before the first seconds are shot: their moment once they have passed.
  private firstSeconds(nowMs: number): string | null {
    this.startedAt ??= nowMs;
    if (nowMs - this.startedAt < FIRST_MS) return null;
    this.first = true;
    return 'first-seconds';
  }
}
