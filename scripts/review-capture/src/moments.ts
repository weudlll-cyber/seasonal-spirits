// Seasonal Sumo review capture — which moments of a match to shoot, read from the player's client
// (window.__client) frame by frame: 2 s before each halving, its banner, the island breaking or
// the walls moving, the new season 2 s after it, "last chance", match over, the result and the
// next match's first seconds; for the player alone its fall and respawn, out of lives, holding
// King's zone, carrying, passing and the "no return" mark. Pure: the clock comes in.

import {
  GHOST_BOMB,
  GHOST_FALLING,
  GHOST_NO_RETURN,
  GHOST_OUT,
  GHOST_PROTECTED,
} from '@seasonal-spirits/protocol';
import type { ClientView } from '../../../apps/client/e2e/stack.js';
import type { Role } from './shoot.js';

export interface Shot {
  moment: string;
  roles?: readonly Role[]; // absent: every page
}

const PLAYER: readonly Role[] = ['player'];
const BEFORE_MS = 2000; // "2 s before the halving"
const ZONE_HOLD_MS = 1000; // in King's zone this long counts as holding it

// The player's own moments, each once a match (in order of the flags that mark them).
const OWN: readonly { moment: string; test: (flags: number, was: number) => boolean }[] = [
  { moment: 'own-fall', test: (f) => (f & GHOST_FALLING) !== 0 },
  {
    moment: 'own-respawn',
    test: (f, was) => (f & GHOST_PROTECTED) !== 0 && (was & GHOST_OUT) !== 0,
  },
  { moment: 'carrying-bomb', test: (f) => (f & GHOST_BOMB) !== 0 },
  { moment: 'passed-bomb', test: (f, was) => (was & GHOST_BOMB) !== 0 && (f & GHOST_BOMB) === 0 },
  { moment: 'no-return', test: (f) => (f & GHOST_NO_RETURN) !== 0 },
];

// The player stands in King's zone.
function inZone(v: ClientView): boolean {
  const z = v.gameMode === 'hill' ? v.area : null;
  return !!(z && v.own && Math.hypot(v.own.x - z.x, v.own.y - z.y) < z.r);
}

export class Director {
  private queue: { at: number; shot: Shot }[] = [];
  private readonly done = new Set<string>();
  private halvings: number | null = null;
  private result = false;
  private seenResult = false;
  private flags = 0;
  private inZoneSince: number | null = null;
  finished = false; // the next match's first seconds are shot

  // One frame of the player's client at `nowMs`.
  observe(v: ClientView & { out?: boolean }, nowMs: number): void {
    this.halving(v, nowMs);
    if (v.countdown?.toEnd) this.once('last-chance', nowMs);
    if (v.result && !this.result) {
      this.seenResult = true;
      this.at(nowMs + 300, { moment: 'match-over' });
      this.at(nowMs + 3000, { moment: 'result' });
      this.at(nowMs + 8000, { moment: 'result-later' });
    }
    if (!v.result && this.result && this.seenResult)
      this.at(nowMs + 2500, { moment: 'next-match' });
    this.result = v.result;
    if (v.result) return;
    this.own(v, nowMs);
  }

  // The shots due at `nowMs`, in order.
  due(nowMs: number): Shot[] {
    const ready = this.queue.filter((q) => q.at <= nowMs);
    this.queue = this.queue.filter((q) => q.at > nowMs);
    if (ready.some((q) => q.shot.moment === 'next-match')) this.finished = true;
    return ready.map((q) => q.shot);
  }

  private halving(v: ClientView, nowMs: number): void {
    const h = v.halvings + 1;
    const cd = v.countdown;
    if (cd && !cd.toEnd && cd.ms <= BEFORE_MS) this.once(`halving-${String(h)}-before`, nowMs);
    if (this.halvings !== null && v.halvings > this.halvings) {
      const k = String(v.halvings);
      this.at(nowMs + 300, { moment: `halving-${k}-banner` });
      this.at(nowMs + 1300, { moment: `halving-${k}-moving` });
      this.at(nowMs + 2500, { moment: `season-${String(v.halvings + 1)}-start` });
    }
    this.halvings = v.halvings;
  }

  private own(v: ClientView & { out?: boolean }, nowMs: number): void {
    const flags = v.own?.flags ?? 0;
    for (const o of OWN) if (o.test(flags, this.flags)) this.once(o.moment, nowMs, PLAYER);
    this.flags = flags;
    if (v.out) this.once('out-watching', nowMs, PLAYER);
    this.inZoneSince = inZone(v) ? (this.inZoneSince ?? nowMs) : null;
    if (this.inZoneSince !== null && nowMs - this.inZoneSince >= ZONE_HOLD_MS)
      this.once('holding-zone', nowMs, PLAYER);
  }

  private once(moment: string, nowMs: number, roles?: readonly Role[]): void {
    if (this.done.has(moment)) return;
    this.done.add(moment);
    this.at(nowMs, roles ? { moment, roles } : { moment });
  }

  private at(at: number, shot: Shot): void {
    this.queue.push({ at, shot });
  }
}
