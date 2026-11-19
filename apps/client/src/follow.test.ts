// Seasonal Sumo — the phone's follow camera in King and Bomb (2026-11-19): only on a portrait
// screen, for a player, with the setting on; a body about 22 px wide (decision 2026-11-19), centred on the own
// character but never showing more beyond the walls than it must; the whole field once it fits;
// eased, never jumping.

import { DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import { cameraBox, fitBox, ghostRadiusPx, halfPx, shape, sx, sy } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';
import { CameraEase, FOLLOW_BODY_PX, followView, followWanted } from './follow.js';

const canvas = (width: number, height: number): CanvasRenderingContext2D =>
  ({ canvas: { width, height } }) as CanvasRenderingContext2D;
const phone = canvas(390, 844);
const HILL = 1;
const TOP = 104;
const room = { keepOut: [{ left: 200, top: 700, right: 390, bottom: 844 }], marginPx: 8 };
const screen = { ctx: phone, top: TOP, room };
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
  const seenHalf = (halfPx(screen) * 2 * shape().ghostRadius) / FOLLOW_BODY_PX;

  it('draws a body about 22 px wide, the own character in the middle of the square it shows', () => {
    const v = followView(phone, TOP, room, { s: state(700, 2), own: own(1000, 1000) });
    expect(v && 2 * ghostRadiusPx(v)).toBeCloseTo(FOLLOW_BODY_PX, 9);
    const mid = fitBox(phone, TOP, { x: 1000, y: 1000, half: seenHalf }, room);
    expect(v && sx(v, 1000)).toBeCloseTo(sx(mid, 1000), 6);
    expect(v && sy(v, 1000)).toBeCloseTo(sy(mid, 1000), 6);
  });

  it('stops at the walls: in a corner it shows no more beyond them than the middle would', () => {
    const s = state(700, 2);
    const middle = followView(phone, TOP, room, { s, own: own(1000, 1000) });
    const corner = followView(phone, TOP, room, { s, own: own(1000 - 690, 1000 - 690) });
    const b = cameraBox(s, screen);
    expect(corner && sx(corner, b.x - b.half)).toBeCloseTo(
      middle ? sx(middle, 1000 - seenHalf) : 0,
      6,
    );
  });

  it('shows the whole field once it fits at that scale', () => {
    // Walls at 240: the camera's square (with a character's and the fence's room) is smaller
    // than the followed square on this phone.
    expect(followView(phone, TOP, room, { s: state(240), own: own(1000, 1000) })).toBeNull();
    expect(followView(phone, TOP, room, { s: state(450), own: own(1000, 1000) })).not.toBeNull();
  });
});

describe('the follow camera: easing', () => {
  it('glides towards a new view over about 150 ms and snaps after a pause', () => {
    const e = new CameraEase();
    const a = { ...fitBox(phone, TOP, cameraBox(undefined, screen), room) };
    const b = { ...a, ox: a.ox + 100 };
    expect(e.ease(a, 0).ox).toBe(a.ox);
    const half = e.ease(b, 150).ox - a.ox;
    expect(half).toBeGreaterThan(55);
    expect(half).toBeLessThan(70);
    expect(e.ease(a, 10_000).ox).toBe(a.ox);
  });
});
