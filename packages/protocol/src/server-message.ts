// Seasonal Spirits — the one reader for the server's text messages (state travels as binary).
// Clients and the probe never trust a server frame's shape either: a frame that does not
// match is dropped instead of being read field by field.

import { isIntIn, isObject } from './checks.js';
import { isTeamSignal } from './client-message.js';
import type { ServerMessage, ServerSignal, ServerSteal, ServerWelcome } from './messages.js';
import { MAX_RECAP_BYTES, readRecap } from './recap-message.js';

// Every message but the recap is a welcome or shorter, well under this.
const MAX_SERVER_TEXT_BYTES = 256;
const MAX_NAME_LENGTH = 64;

export function parseServerMessage(text: string): ServerMessage | null {
  if (text.length > MAX_RECAP_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(value)) return null;
  const fields = value;
  if (fields.kind === 'recap') return readRecap(fields);
  if (text.length > MAX_SERVER_TEXT_BYTES) return null;
  if (fields.kind === 'spectating') {
    return fields.reason === 'full' ? { kind: 'spectating', reason: 'full' } : null;
  }
  if (fields.kind === 'steal') return readSteal(fields);
  if (fields.kind === 'signal') return readSignal(fields);
  return fields.kind === 'welcome' ? readWelcome(fields) : null;
}

// A steal names two different ghosts and at least one coin (a steal takes at least one).
function readSteal(fields: Record<string, unknown>): ServerSteal | null {
  const { thief, victim, coins } = fields;
  if (!isIntIn(thief, 0, 255) || !isIntIn(victim, 0, 255) || thief === victim) return null;
  return isIntIn(coins, 1, 65535) ? { kind: 'steal', thief, victim, coins } : null;
}

// A teammate's signal: a ghost, one of the fixed signals, a field position.
function readSignal(fields: Record<string, unknown>): ServerSignal | null {
  const { ghost, signal, x, y } = fields;
  if (!isIntIn(ghost, 0, 255) || !isTeamSignal(signal)) return null;
  return isIntIn(x, 0, 65535) && isIntIn(y, 0, 65535)
    ? { kind: 'signal', ghost, signal, x, y }
    : null;
}

function readWelcome(fields: Record<string, unknown>): ServerWelcome | null {
  const { ghost, team, name } = fields;
  if (!isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3)) return null;
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return { kind: 'welcome', ghost, team, name };
}
