// Seasonal Spirits — binary state encoding for the empty-map probe.
// One encoding only. The server sends this every tick; viewer and probe decode it.

export interface GhostState {
  id: number; // 0..255
  x: number; // 0..65535 units
  y: number;
  flags: number; // 0..255, bitfield for future use
}

export interface ServerState {
  tick: number; // u32 since server start
  serverMs: number; // u32 ms since server start (wraps at ~49 days; fine for a 2 min probe)
  ghosts: GhostState[]; // length up to 255
}

// Header layout:
//   tick       u32 LE  (offset 0)
//   serverMs   u32 LE  (offset 4)
//   count      u8      (offset 8)
// Per-ghost (6 bytes):
//   id         u8
//   x          u16 LE
//   y          u16 LE
//   flags      u8
export const HEADER_BYTES = 9;
export const GHOST_BYTES = 6;

export function encodedSize(ghostCount: number): number {
  return HEADER_BYTES + GHOST_BYTES * ghostCount;
}

export function encodeState(s: ServerState): Uint8Array {
  if (s.ghosts.length > 255) {
    throw new Error('encodeState: more than 255 ghosts');
  }
  const buf = new Uint8Array(encodedSize(s.ghosts.length));
  const view = new DataView(buf.buffer);
  view.setUint32(0, s.tick >>> 0, true);
  view.setUint32(4, s.serverMs >>> 0, true);
  view.setUint8(8, s.ghosts.length);
  let o = HEADER_BYTES;
  for (const g of s.ghosts) {
    view.setUint8(o, g.id & 0xff);
    view.setUint16(o + 1, Math.max(0, Math.min(65535, Math.round(g.x))), true);
    view.setUint16(o + 3, Math.max(0, Math.min(65535, Math.round(g.y))), true);
    view.setUint8(o + 5, g.flags & 0xff);
    o += GHOST_BYTES;
  }
  return buf;
}

export function decodeState(buf: Uint8Array): ServerState {
  if (buf.byteLength < HEADER_BYTES) {
    throw new Error('decodeState: buffer too short for header');
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tick = view.getUint32(0, true);
  const serverMs = view.getUint32(4, true);
  const count = view.getUint8(8);
  const expected = encodedSize(count);
  if (buf.byteLength !== expected) {
    throw new Error(
      `decodeState: expected ${expected} bytes for ${count} ghosts, got ${buf.byteLength}`,
    );
  }
  const ghosts: GhostState[] = [];
  let o = HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    ghosts.push({
      id: view.getUint8(o),
      x: view.getUint16(o + 1, true),
      y: view.getUint16(o + 3, true),
      flags: view.getUint8(o + 5),
    });
    o += GHOST_BYTES;
  }
  return { tick, serverMs, ghosts };
}

// Client -> server input message, JSON over the text channel.
// A player sends a normalized direction (magnitude <= 1); the server clamps. Spectators
// send nothing after the hello.
export interface ClientHello {
  kind: 'player' | 'spectator';
}

export interface ClientInput {
  kind: 'input';
  dx: number;
  dy: number;
}

export type ClientMessage = ClientHello | ClientInput;
