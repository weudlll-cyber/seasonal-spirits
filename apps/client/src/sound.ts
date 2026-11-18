// Seasonal Sumo — the game's sounds (NIGHT 2026-11-19, piece 5; before it one tone at every
// deadline, CONCEPT.md §2b): short, soft notes and noise bursts made with Web Audio, no audio
// file — a whoosh at the own dash, a thump at a hit, a boing at a jump and a tap at the landing,
// a falling whistle and a splash at a fall, a crack and a rumble at sumo's halving, a chime when
// King of the Season's zone moves, a pop when the bombs blow and their ticking, the countdown's
// beeps and a short fanfare at the match end (which sound when: sound-events.ts). Behind the
// Sound switch: muted, nothing plays. Browsers allow sound only after a user gesture, so the
// context starts on the first key or touch; the mute choice is remembered.

import { HIT_REACH, clientConfig, readSetting, writeSetting } from '@seasonal-spirits/render';
import type { ServerState } from '@seasonal-spirits/protocol';
import { soundEvents, type SoundName } from './sound-events.js';

const MUTE_KEY = 'seasonal-spirits.muted';
const MASTER = 0.35; // every sound through this: modest

// One part of a sound: a tone gliding from `from` to `to` Hz, or noise (`from` 0) through a
// band-pass at `to` Hz; starting `at` s in, lasting `dur` s, at `vol`.
interface Part {
  wave: OscillatorType | 'noise';
  from: number;
  to: number;
  at: number;
  dur: number;
  vol: number;
}

const tone = ([from, to]: readonly [number, number], at: number, dur: number, vol = 0.5): Part => ({
  wave: 'triangle',
  from,
  to,
  at,
  dur,
  vol,
});
const noise = (band: number, at: number, dur: number, vol = 0.5): Part => ({
  wave: 'noise',
  from: 0,
  to: band,
  at,
  dur,
  vol,
});

// Every sound the game makes.
export const SOUNDS: Record<SoundName, readonly Part[]> = {
  dash: [noise(1800, 0, 0.22, 0.45)],
  hit: [tone([140, 60], 0, 0.16, 0.8), noise(500, 0, 0.08, 0.4)],
  jump: [{ ...tone([220, 560], 0, 0.22, 0.45), wave: 'sine' }],
  land: [noise(900, 0, 0.06, 0.35)],
  fall: [{ ...tone([1400, 300], 0, 0.9, 0.3), wave: 'sine' }, noise(700, 0.85, 0.4, 0.5)],
  halving: [noise(2500, 0, 0.12, 0.7), noise(120, 0.05, 0.9, 0.7)],
  zone: [tone([660, 660], 0, 0.3), tone([990, 990], 0.12, 0.4)],
  blast: [noise(300, 0, 0.35, 0.9), tone([180, 50], 0, 0.3, 0.6)],
  tick: [{ ...tone([1800, 1800], 0, 0.03, 0.25), wave: 'square' }],
  beep: [tone([880, 880], 0, 0.12, 0.4)],
  fanfare: [
    tone([523, 523], 0, 0.18),
    tone([659, 659], 0.16, 0.18),
    tone([784, 784], 0.32, 0.18),
    tone([1047, 1047], 0.48, 0.5),
  ],
};

export class Sound {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private before: ServerState | undefined; // the state before, for the events
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

  // Every state: the sounds it calls for against the state before (sound-events.ts); a knock
  // within HIT_REACH body radii of the own dash is its hit.
  observe(s: ServerState, ownId: number | null): void {
    const own = { id: ownId, reach: HIT_REACH * clientConfig(s.mode).ghostRadius };
    for (const name of soundEvents(this.before, s, own)) this.play(name);
    this.before = s;
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
    for (const part of SOUNDS[name]) this.part(ctx, master, part);
  }

  private part(ctx: AudioContext, out: AudioNode, p: Part): void {
    const t = ctx.currentTime + p.at;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(p.vol, t + Math.min(0.02, p.dur / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
    gain.connect(out);
    if (p.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise(ctx);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = p.to;
      src.connect(band).connect(gain);
      src.start(t);
      src.stop(t + p.dur + 0.05);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = p.wave;
    osc.frequency.setValueAtTime(p.from, t);
    osc.frequency.exponentialRampToValueAtTime(p.to, t + p.dur);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + p.dur + 0.05);
  }

  // One second of white noise, made once.
  private noise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }
}
