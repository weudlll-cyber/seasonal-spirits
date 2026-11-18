// Seasonal Sumo — which game the next match plays (moved out of match-host.ts in the admin panel
// rebuild): the rotation's slot for the match number, or a game the admin panel started — that
// one once, or for every following match while "keep playing this game" is on (a switch of the
// development session, not a gameplay setting) —, and sumo's variant.

import { SUMO_VARIANTS, type RotationSlot, type SumoVariant } from '@seasonal-spirits/game-core';

const SUMO: RotationSlot = { mode: 'sumo', variant: 'points' };

export class NextGame {
  private forced: RotationSlot | null = null;
  private keep = false;
  private sumoMatches = 0; // sumo matches started: "alternate" takes the variants in turn

  // The panel's "start": `game` next, and after it the rotation unless `keep`.
  started(game: RotationSlot, keep: boolean): void {
    this.forced = game;
    this.keep = keep;
  }

  // The switch on its own: on holds `running`, the running match's game; off lets the rotation
  // go on from the next match.
  keepOn(on: boolean, running: RotationSlot): void {
    this.keep = on;
    this.forced = on ? running : null;
  }

  keeping(): boolean {
    return this.keep;
  }

  // The game of the next match, from `rotation` and its number unless one was started, and its
  // sumo variant — in turn for "alternate", Points first.
  pick(
    rotation: readonly RotationSlot[],
    matchNumber: number,
  ): { slot: RotationSlot; variant: SumoVariant } {
    const slot = this.forced ?? rotation[matchNumber % rotation.length] ?? SUMO;
    if (!this.keep) this.forced = null;
    if (slot.mode !== 'sumo') return { slot, variant: 'points' };
    const turn = SUMO_VARIANTS[this.sumoMatches % SUMO_VARIANTS.length] ?? 'points';
    this.sumoMatches++;
    return { slot, variant: slot.variant === 'alternate' ? turn : slot.variant };
  }
}
