// Seasonal Sumo — the phone's follow camera in King and Bomb (2026-11-19): only on a portrait
// screen, for a player, with the setting on; at Sumo's scale on that screen, centred on the own
// character but never showing more beyond the walls than it must; the whole field once it fits;
// eased, never jumping.

import { DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import { cameraBox, fitBox, sx, sy } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';
import { CameraEase, followView, followWanted } from './follow.js';

const canvas = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;
const phone = canvas(390, 844);
const HILL = 1;
const TOP = 104;
const room = { keepOut: [{ left: 200, top: 700, right: 390, bottom: 844 }], marginPx: 8 };
const state = (wall: number, mode = HILL): ServerState =>
  ({ mode, wall, area: null, next: null, ghosts: [] }) as unknown as ServerState;
const own = (x: number, y: number): GhostState => ({ id: 1, x, y, flags: 0 }) as GhostState;
const input = (s: ServerState, o: GhostState | undefined = own(1000, 1000)) => ({
  s,
  own: o,
  tuning: null,
});

describe('the follow camera: when', () => {
  it('follows a player in King and Bomb on a portrait screen', () => {
    expect(followWanted(phone, input(state(450)))).toBe(true);
    expect(followWanted(phone, input(state(700, 2)))).toBe(true);
  });

  it('keeps the whole field on a landscape screen, in Sumo, while watching, or switched off', () => {
    expect(followWanted(canvas(844, 390), input(state(450)))).toBe(false);
    expect(followWanted(phone, input(state(0, 0)))).toBe(false);
    expect(followWanted(phone, { ...input(state(450)), own: undefined })).toBe(false);
    const off = { ...input(state(450)), tuning: { ...DEFAULT_SETTINGS, phoneFollow: 0 } };
    expect(followWanted(phone, off)).toBe(false);
  });
});

describe('the follow camera: where', () => {
  const sumo = fitBox(phone, TOP, cameraBox(undefined), room);

  it("draws at Sumo's scale on that screen, the own character where Sumo's middle is", () => {
    const v = followView(phone, TOP, room, { s: state(700, 2), own: own(1000, 1000) });
    expect(v?.scale).toBeCloseTo(sumo.scale, 9);
    expect(v && sx(v, 1000)).toBeCloseTo(sx(sumo, 1000), 6);
    expect(v && sy(v, 1000)).toBeCloseTo(sy(sumo, 1000), 6);
  });

  it('stops at the walls: in a corner it shows no more beyond them than the middle would', () => {
    const s = state(700, 2);
    const corner = followView(phone, TOP, room, { s, own: own(1000 - 690, 1000 - 690) });
    const b = cameraBox(s);
    expect(corner && sx(corner, b.x - b.half)).toBeCloseTo(
      sx(sumo, 1000 - cameraBox(undefined).half),
      6,
    );
  });

  it('shows the whole field once it fits at that scale', () => {
    expect(followView(phone, TOP, room, { s: state(250), own: own(1000, 1000) })).toBeNull();
  });
});

describe('the follow camera: easing', () => {
  it('glides towards a new view over about 150 ms and snaps after a pause', () => {
    const e = new CameraEase();
    const a = { ...fitBox(phone, TOP, cameraBox(undefined), room) };
    const b = { ...a, ox: a.ox + 100 };
    expect(e.ease(a, 0).ox).toBe(a.ox);
    const half = e.ease(b, 150).ox - a.ox;
    expect(half).toBeGreaterThan(55);
    expect(half).toBeLessThan(70);
    expect(e.ease(a, 10_000).ox).toBe(a.ox);
  });
});
