// Seasonal Spirits — team signal markers (owner decision 2026-11-16): a teammate's "Attack" or
// "To shrine" stays at the position where it was sent for CLIENT_CONFIG.signalShowMs, on the
// field and on the minimap. The server sends a team's signals to that team's players only;
// this file just keeps and draws what arrived. Bounded: one marker per ghost, at most 32.

import type { ServerSignal, TeamSignal } from '@seasonal-spirits/protocol';
import { TEXT, circle, sx, sy, type View } from '@seasonal-spirits/render';
import { CLIENT_CONFIG } from './config.js';

export const SIGNAL_WORDS: Record<TeamSignal, string> = { attack: 'Attack', home: 'To shrine' };
const MAX_MARKERS = 32;

export interface Marker {
  ghost: number;
  signal: TeamSignal;
  x: number;
  y: number;
  until: number; // performance.now() when it goes
}

export class SignalMarkers {
  private list: Marker[] = [];

  add(s: ServerSignal, now: number): void {
    const marker = { ghost: s.ghost, signal: s.signal, x: s.x, y: s.y };
    const others = this.list.filter((m) => m.ghost !== s.ghost);
    this.list = [...others, { ...marker, until: now + CLIENT_CONFIG.signalShowMs }].slice(
      -MAX_MARKERS,
    );
  }

  // The markers still showing at `now`; the others are dropped.
  active(now: number): readonly Marker[] {
    this.list = this.list.filter((m) => m.until > now);
    return this.list;
  }
}

// A ring at the sender's position in its team colour, the signal's word above it.
export function drawMarkers(v: View, markers: readonly Marker[], colour: string): void {
  const { ctx } = v;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const m of markers) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    circle(v, m.x, m.y, 26);
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.fillText(SIGNAL_WORDS[m.signal], sx(v, m.x), sy(v, m.y) - 32);
  }
  ctx.textAlign = 'start';
}
