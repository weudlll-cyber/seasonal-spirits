// Seasonal Spirits — ws RawData (Buffer, ArrayBuffer or Buffer[]) as one Uint8Array.
// Shared by the probe bot and the headless spectator, which both decode state messages.

import type { RawData } from 'ws';

export function toUint8Array(data: RawData): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data));
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
