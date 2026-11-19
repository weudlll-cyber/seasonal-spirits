// Seasonal Sumo — the phone's follow camera in the walled modes (2026-11-19: on a portrait phone
// King's and Bomb's square fields fitted only the width, the characters were tiny). On a portrait
// screen, for a player on the field in King or Bomb, the camera follows the own character at a
// scale where a body is FOLLOW_BODY_PX wide (decision 2026-11-19, BACKLOG am; was Sumo's starting
// scale, about 14 px), clamped so it shows no more beyond the walls than it must, and eased
// (about 150 ms); a minimap shows where it is (render minimap.ts). Once the walls have closed in
// so far that the whole field fits at that scale, the whole field shows. The owner's setting
// "Phone: follow camera in walled modes" switches it; desktop, landscape and spectators keep the
// whole field.

import { DEFAULT_SETTINGS, walled, type Settings } from '@seasonal-spirits/game-core';
import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import {
  cameraBox,
  clientConfig,
  fitBox,
  halfPx,
  shape,
  type Room,
  type View,
} from '@seasonal-spirits/render';

const EASE_MS = 150;
const SNAP_MS = 500; // a frame longer ago than this: no easing from it (a new view, a resize)
export const FOLLOW_BODY_PX = 22; // a character's body diameter on screen while followed

// What the follow camera needs to know of the frame.
export interface FollowInput {
  s: ServerState | undefined;
  own: GhostState | undefined; // as drawn; undefined while watching
  tuning: Settings | null;
}

// Whether the follow camera is wanted: the setting on, a portrait screen, a player's ghost in
// King or Bomb.
export function followWanted(ctx: CanvasRenderingContext2D, f: FollowInput): boolean {
  const { width, height } = ctx.canvas;
  const on = (f.tuning ?? DEFAULT_SETTINGS).phoneFollow === 1;
  return on && height > width && !!f.s && !!f.own && walled(clientConfig(f.s.mode));
}

// The followed view: a body FOLLOW_BODY_PX wide, centred on the own character, clamped to the
// walls; null when the whole field fits at that scale.
export function followView(
  ctx: CanvasRenderingContext2D,
  top: number,
  room: Room,
  f: Required<Pick<FollowInput, 's'>> & { own: { x: number; y: number } },
): View | null {
  const screen = { ctx, top, room };
  const b = cameraBox(f.s, screen);
  // The square the followed view shows, centred on the field's middle.
  const seen = {
    x: b.x,
    y: b.y,
    half: (halfPx(screen) * 2 * shape().ghostRadius) / FOLLOW_BODY_PX,
  };
  const free = b.half - seen.half; // how far the centre may move from the field's middle
  if (free <= 0) return null;
  const fit = fitBox(ctx, top, seen, room);
  const clampTo = (p: number, c: number): number => Math.min(c + free, Math.max(c - free, p));
  const fx = clampTo(f.own.x, b.x);
  const fy = clampTo(f.own.y, b.y);
  // Where the fit puts the square's centre on screen: the followed point goes there.
  const cx = fit.ox + seen.x * fit.scale;
  const cy = fit.oy + seen.y * fit.scale * fit.tilt;
  return { ...fit, ox: cx - fx * fit.scale, oy: cy - fy * fit.scale * fit.tilt };
}

// Eases the camera towards each frame's view (scale, slant and offset alike), so following and
// the switch to the whole field glide; reset whenever the follow camera is not in use.
export class CameraEase {
  private last: { view: View; atMs: number } | null = null;

  ease(target: View, nowMs: number): View {
    const prev = this.last;
    const dt = prev ? nowMs - prev.atMs : Infinity;
    let view = target;
    if (prev && dt < SNAP_MS) {
      const k = 1 - Math.exp(-dt / EASE_MS);
      const to = (a: number, b: number): number => a + (b - a) * k;
      const p = prev.view;
      view = {
        ...target,
        scale: to(p.scale, target.scale),
        tilt: to(p.tilt, target.tilt),
        ox: to(p.ox, target.ox),
        oy: to(p.oy, target.oy),
      };
    }
    this.last = { view, atMs: nowMs };
    return view;
  }

  reset(): void {
    this.last = null;
  }
}
