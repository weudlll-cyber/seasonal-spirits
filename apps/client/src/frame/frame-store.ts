// Seasonal Sumo — what the React frame (Frame.tsx) needs from the game loop: whether a match runs
// (the kit's focus mode) and how many results were filled (the result frame fits again on each).
// A tiny external store for React's useSyncExternalStore: its listeners hear real changes only,
// so the loop may report every frame.

export interface FrameSnapshot {
  readonly running: boolean;
  readonly results: number;
}

let current: FrameSnapshot = { running: false, results: 0 };
const listeners = new Set<() => void>();

function set(next: FrameSnapshot): void {
  if (next.running === current.running && next.results === current.results) return;
  current = next;
  for (const listener of listeners) listener();
}

export const frameSnapshot = (): FrameSnapshot => current;

export function subscribeFrame(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setRunning(running: boolean): void {
  set({ ...current, running });
}

export function resultFilled(): void {
  set({ ...current, results: current.results + 1 });
}
