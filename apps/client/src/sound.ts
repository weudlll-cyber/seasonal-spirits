// Seasonal Spirits — the one sound of Phase 1 (CONCEPT.md §2b): a recognisable tone at every
// halving, generated with Web Audio (no audio file). Browsers allow sound only after a user
// gesture, so the context starts on the first key or touch; the mute choice is remembered.

import { readSetting, writeSetting } from './storage.js';

const MUTE_KEY = 'seasonal-spirits.muted';

export class HalvingTone {
  private ctx: AudioContext | null = null;
  muted: boolean;

  constructor() {
    this.muted = readSetting(MUTE_KEY) === '1';
    const unlock = (): void => {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    writeSetting(MUTE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  // A falling two-note chime: a fifth, then the root an octave lower, about 0.9 s.
  play(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    for (const [freq, at] of [
      [880, 0],
      [440, 0.18],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.25, t + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + at);
      osc.stop(t + at + 0.75);
    }
  }
}
