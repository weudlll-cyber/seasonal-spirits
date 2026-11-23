// Seasonal Sumo — the page's motion setting: with prefers-reduced-motion the ambient motion holds
// still and the effects are shortened. Without a window (the unit tests) motion is on.

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
