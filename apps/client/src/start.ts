// Seasonal Sumo — the start screen: "Seasonal Party" over a small island with the four seasons'
// characters in the game's sky while the client joins. It never blocks input and fades out after
// the first state; no name entry, no team choice (the server seats the player).

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
    const c = this.ctx;
    if (c) {
      // The whole screen, like the game's canvas.
      if (c.canvas.width !== window.innerWidth) c.canvas.width = window.innerWidth;
      if (c.canvas.height !== window.innerHeight) c.canvas.height = window.innerHeight;
      drawStartScene(c, nowMs);
    }
    if (!ready || nowMs - this.since < MIN_MS) return;
    this.gone = true;
    this.root.classList.add('gone');
    // Hidden after the fade (0.4 s in styles/screens.css); a timer, as no transition runs with reduced
    // motion.
    setTimeout(() => (this.root.hidden = true), 450);
  }
}
