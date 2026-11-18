// Seasonal Sumo — the page's motion setting (NIGHT 2026-11-19): with prefers-reduced-motion the
// ambient motion (drifting clouds, moving waves, swaying grass and trees, the sun's ring, the
// twinkling stars) holds still and the effects (squash and stretch, the landing dust, the hit's
// star) are shortened. Without a window (the unit tests) motion is on.

let query: MediaQueryList | null | undefined;

export function reducedMotion(): boolean {
  if (query === undefined) {
    query =
      typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return query?.matches ?? false;
}

// The time the ambient motion runs on: frozen at 0 with reduced motion.
export function ambientMs(nowMs: number): number {
  return reducedMotion() ? 0 : nowMs;
}

// An effect's length in ms: half as long with reduced motion.
export function effectMs(ms: number): number {
  return reducedMotion() ? ms / 2 : ms;
}
