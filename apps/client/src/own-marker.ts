// Seasonal Sumo — when the own ghost needs finding, from the states: a pulse after a respawn and at
// each match start, and after a fall the countdown to its return on the server's clock (outMs).

import {
  GHOST_FALLING,
  GHOST_OUT,
  STATE_RESULT,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { PULSE_MS } from '@seasonal-spirits/render';

export class OwnMarker {
  private pulseFrom: number | null = null; // client time the pulse began
  private fellAtServerMs: number | null = null;
  private seen = false; // the own ghost was in a state before
  private wasOver = false;
  private backIn: number | null = null;

  // Every state, in order; `now` the client time it arrived, `outMs` the mode's time out.
  observe(s: ServerState, ownId: number | null, now: number, outMs: number): void {
    const own = s.ghosts.find((g) => g.id === ownId);
    const over = (s.flags & STATE_RESULT) !== 0;
    if (!own) {
      this.seen = false;
      this.backIn = null;
      return;
    }
    const away = (own.flags & (GHOST_FALLING | GHOST_OUT)) !== 0;
    if (away && this.fellAtServerMs === null) this.fellAtServerMs = s.serverMs;
    const back = !away && this.fellAtServerMs !== null;
    if (!this.seen || back || (this.wasOver && !over)) this.pulseFrom = now;
    if (!away) this.fellAtServerMs = null;
    this.backIn =
      this.fellAtServerMs === null || own.lives === 0
        ? null
        : Math.max(0, outMs - (s.serverMs - this.fellAtServerMs));
    this.seen = true;
    this.wasOver = over;
  }

  // Since the pulse began, while it runs; null otherwise.
  pulseMs(now: number): number | null {
    if (this.pulseFrom === null || now - this.pulseFrom >= PULSE_MS) return null;
    return now - this.pulseFrom;
  }

  // While the own ghost is out after a fall: ms until it is back; null otherwise.
  backInMs(): number | null {
    return this.backIn;
  }
}

const seconds = (ms: number): string => String(Math.max(1, Math.ceil(ms / 1000)));

// The band's line while the own ghost is out: whole seconds, counting down.
export function fellLine(backInMs: number): string {
  return `You fell — back in ${seconds(backInMs)}`;
}

// The same on a narrow phone, where the whole line ran into "…" before its seconds beside the
// corner's three buttons (review 2026-11-22; team-line.ts shows one of the two).
export function backLine(backInMs: number): string {
  return `Back in ${seconds(backInMs)}`;
}
