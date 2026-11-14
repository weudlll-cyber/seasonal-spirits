// Seasonal Spirits — the one reader for the server's text messages (state travels as binary).
// Clients and the probe never trust a server frame's shape either: a frame that does not
// match is dropped instead of being read field by field.

import type { ServerWelcome } from './state.js';

// The welcome is small; anything much longer is not one.
const MAX_SERVER_TEXT_BYTES = 256;

export function parseServerMessage(text: string): ServerWelcome | null {
  if (text.length > MAX_SERVER_TEXT_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { kind, ghost, team } = value as Record<string, unknown>;
  if (kind !== 'welcome' || !isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3)) return null;
  return { kind, ghost, team };
}

function isIntIn(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}
