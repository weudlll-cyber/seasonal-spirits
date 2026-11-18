// Seasonal Sumo — the start screen (NIGHT 2026-11-19, piece 4): "Seasonal Party" over a small
// floating island with the four seasons' characters idling on it (render podium.ts), while the
// client connects and joins. It never blocks: no input waits on it, it lets every touch through,
// and it fades out once the first state is in and it has shown for a moment. There is no name
// entry and no team choice — the server seats a player on a team (connection.ts).

import { drawStartScene } from '@seasonal-spirits/render';
import { el } from './hud.js';

const MIN_MS = 1200; // shown at least this long, so it is seen and not a flicker

export class StartScreen {
  private readonly root = el('start');
  private readonly ctx = el('start-island', HTMLCanvasElement).getContext('2d');
  private readonly since = performance.now();
  private gone = false;

  // Once a frame: draws the island while shown; fades out when `ready` (a state is in).
  update(ready: boolean, nowMs: number): void {
    if (this.gone) return;
    if (this.ctx) drawStartScene(this.ctx, nowMs);
    if (!ready || nowMs - this.since < MIN_MS) return;
    this.gone = true;
    this.root.classList.add('gone');
    // Hidden after the fade (0.4 s in index.html); a timer, as no transition runs with reduced
    // motion.
    setTimeout(() => (this.root.hidden = true), 450);
  }
}
