// Seasonal Sumo — the game's sounds: every state event maps to a sound, each sound has something
// to play, and with the Sound switch off nothing plays.

import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { soundEvents, type SoundName } from './sound-events.js';

const ghost = (id: number, over: Partial<GhostState> = {}): GhostState => ({
  id,
  team: 0,
  x: 1000,
  y: 1000,
  vx: 0,
  vy: 0,
  flags: 0,
  dashLeftMs: 0,
  score: 0,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
  ...over,
});

const state = (over: Partial<ServerState> = {}): ServerState => ({
  tick: 0,
  serverMs: 0,
  matchMs: 0,
  season: 0,
  seasonNumber: 0,
  seasonLeftMs: 40_000,
  countdownMs: null,
  flags: 0,
  nextMatchMs: 0,
  teamScore: [0, 0, 0, 0],
  mode: 0,
  livesAtStart: 3,
  wall: 0,
  area: { x: 1000, y: 1000, r: 400 },
  next: null,
  ghosts: [ghost(1)],
  ...over,
});

const OWN = { id: 1, reach: 60 };
const own = (over: Partial<GhostState>): ServerState => state({ ghosts: [ghost(1, over)] });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sound events', () => {
  it("maps the own character's dash, knock, jump, landing and fall to their sounds", () => {
    const cases: [ServerState, ServerState, SoundName][] = [
      [state(), own({ flags: GHOST_DASHING }), 'dash'],
      [state(), own({ vx: 5000 }), 'hit'],
      [state(), own({ flags: GHOST_AIRBORNE }), 'jump'],
      [own({ flags: GHOST_AIRBORNE }), state(), 'land'],
      [state(), own({ flags: GHOST_FALLING }), 'fall'],
    ];
    for (const [a, b, sound] of cases) expect(soundEvents(a, b, OWN), sound).toContain(sound);
  });

  it('maps the halving per mode, the match end, the countdown and the bombs', () => {
    const halving = { flags: STATE_HALVING_EVENT };
    expect(soundEvents(state(), state({ ...halving, mode: 0 }), OWN)).toContain('halving');
    expect(soundEvents(state(), state({ ...halving, mode: 1 }), OWN)).toContain('zone');
    expect(soundEvents(state(), state({ ...halving, mode: 2 }), OWN)).toContain('blast');
    const end = state({ flags: STATE_MATCH_END_EVENT });
    expect(soundEvents(state(), end, OWN)).toContain('fanfare');
    const beep = soundEvents(state({ countdownMs: 3010 }), state({ countdownMs: 2990 }), OWN);
    expect(beep).toContain('beep');
    const bombs = { mode: 2, ghosts: [ghost(1), ghost(2, { flags: GHOST_BOMB })] };
    const ticked = soundEvents(
      state({ ...bombs, seasonLeftMs: 4010 }),
      state({ ...bombs, seasonLeftMs: 3990 }),
      OWN,
    );
    expect(ticked).toContain('tick');
  });

  it('plays nothing new while nothing happens', () => {
    expect(soundEvents(state(), state(), OWN)).toEqual([]);
    expect(soundEvents(undefined, state(), OWN)).toEqual([]);
  });
});

// A Web Audio context that counts what it is asked to make.
async function sound(muted: boolean) {
  const made = { nodes: 0 };
  const node = () => {
    made.nodes++;
    return {
      connect: (n: unknown) => n,
      start: () => undefined,
      stop: () => undefined,
      type: '',
      buffer: null,
      gain: {
        value: 0,
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      frequency: {
        value: 0,
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
    };
  };
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume = () => Promise.resolve();
    createGain = node;
    createOscillator = node;
    createBufferSource = node;
    createBiquadFilter = node;
    createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
  }
  const listeners: (() => void)[] = [];
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('window', { addEventListener: (_: string, f: () => void) => listeners.push(f) });
  vi.stubGlobal('localStorage', { getItem: () => (muted ? '1' : '0'), setItem: () => undefined });
  const { Sound, SOUNDS } = await import('./sound.js');
  const s = new Sound();
  for (const f of listeners) f(); // the first touch starts the context
  return { s, made, SOUNDS };
}

describe('the Sound switch', () => {
  it('gives every sound something to play', async () => {
    const { SOUNDS } = await sound(false);
    for (const [name, parts] of Object.entries(SOUNDS))
      expect(parts.length, name).toBeGreaterThan(0);
  });

  it('plays with Sound on, and nothing at all with Sound off', async () => {
    const on = await sound(false);
    on.s.play('fanfare');
    expect(on.made.nodes).toBeGreaterThan(0);
    const off = await sound(true);
    for (const name of Object.keys(off.SOUNDS) as SoundName[]) off.s.play(name);
    expect(off.made.nodes).toBe(0);
  });
});
