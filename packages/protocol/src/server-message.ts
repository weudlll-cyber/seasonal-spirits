// Seasonal Spirits — the one reader for the server's text messages (state travels as binary).
// Clients and the probe never trust a server frame's shape either: a frame that does not
// match is dropped instead of being read field by field.

import type { ServerMessage, ServerWelcome } from './messages.js';

// The longest message is a welcome, well under this.
const MAX_SERVER_TEXT_BYTES = 256;
const MAX_NAME_LENGTH = 64;

export function parseServerMessage(text: string): ServerMessage | null {
  if (text.length > MAX_SERVER_TEXT_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const fields = value as Record<string, unknown>;
  if (fields.kind === 'spectating') {
    return fields.reason === 'full' ? { kind: 'spectating', reason: 'full' } : null;
  }
  return fields.kind === 'welcome' ? readWelcome(fields) : null;
}

function readWelcome(fields: Record<string, unknown>): ServerWelcome | null {
  const { ghost, team, name } = fields;
  if (!isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3)) return null;
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return { kind: 'welcome', ghost, team, name };
}

function isIntIn(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}
