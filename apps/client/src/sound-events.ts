// Seasonal Sumo — which sounds a new state calls for, from the state before and this one (own dash,
// hit, jump, landing, fall; halving, ticking, countdown, match end). Pure; sound.ts plays them.

import {
  GHOST_AIRBORNE,
  GHOST_BOMB,
  GHOST_DASHING,
  GHOST_FALLING,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { isKnocked, modeOf } from '@seasonal-spirits/render';

export type SoundName =
  | 'dash'
  | 'hit'
  | 'jump'
  | 'land'
  | 'fall'
  | 'halving'
  | 'zone'
  | 'blast'
  | 'tick'
  | 'beep'
  | 'fanfare';

// The own character's id, and how near (field units) a knock must be to be the own dash's hit.
export interface Own {
  id: number | null;
  reach: number;
}

const BEEP_FROM_MS = 5000; // the countdown beeps once a second from here
const QUICK_TICK_MS = 5000; // the bombs tick four times a second from here, else once

export function soundEvents(
  before: ServerState | undefined,
  s: ServerState,
  own: Own,
): SoundName[] {
  const out: SoundName[] = [];
  if (!before) return out;
  out.push(...ownEvents(before, s, own));
  const mode = modeOf(s.mode);
  if (s.flags & STATE_HALVING_EVENT) {
    out.push(mode === 'bomb' ? 'blast' : mode === 'hill' ? 'zone' : 'halving');
  }
  if (s.flags & STATE_MATCH_END_EVENT) out.push('fanfare');
  if (crossed(before.countdownMs, s.countdownMs, 1000, BEEP_FROM_MS)) out.push('beep');
  if (mode === 'bomb' && s.ghosts.some((g) => g.flags & GHOST_BOMB)) {
    const step = s.seasonLeftMs <= QUICK_TICK_MS ? 250 : 1000;
    if (crossed(before.seasonLeftMs, s.seasonLeftMs, step, Infinity)) out.push('tick');
  }
  return out;
}

// The own character's moments: a dash starting, a knock, a jump, a landing, a fall.
function ownEvents(before: ServerState, s: ServerState, own: Own): SoundName[] {
  const was = before.ghosts.find((g) => g.id === own.id);
  const now = s.ghosts.find((g) => g.id === own.id);
  if (!was || !now) return [];
  const rose = (flag: number): boolean => (now.flags & flag) !== 0 && !(was.flags & flag);
  const out: SoundName[] = [];
  if (rose(GHOST_DASHING)) out.push('dash');
  // A knock: the own character knocked, or one near it while the own one dashes.
  const knock = (g: GhostState): boolean => {
    const prev = before.ghosts.find((p) => p.id === g.id);
    return isKnocked(g) && (!prev || !isKnocked(prev));
  };
  const dashing = (now.flags & GHOST_DASHING) !== 0;
  const near = (g: GhostState): boolean => Math.hypot(g.x - now.x, g.y - now.y) <= own.reach;
  if (knock(now) || (dashing && s.ghosts.some((g) => g.id !== own.id && near(g) && knock(g)))) {
    out.push('hit');
  }
  if (rose(GHOST_AIRBORNE)) out.push('jump');
  if (was.flags & GHOST_AIRBORNE && !(now.flags & GHOST_AIRBORNE)) out.push('land');
  if (rose(GHOST_FALLING)) out.push('fall');
  return out;
}

// A time counting down passed a multiple of `step` ms at or below `from` ms.
function crossed(before: number | null, now: number | null, step: number, from: number): boolean {
  if (before === null || now === null || now >= before || now > from) return false;
  return Math.floor(before / step) !== Math.floor(now / step);
}
