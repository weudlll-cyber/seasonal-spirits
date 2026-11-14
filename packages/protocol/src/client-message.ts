// Seasonal Spirits — the one validator for client → server messages.
// Every message from a client passes through here before the server reads a field of it:
// shape, types and ranges are checked, and a fresh object with only the known fields is
// returned. The server and later clients reuse it, so both sides agree on what is valid.

import type { ClientMessage } from './messages.js';

// The largest valid message is an input with two long floats, well under 100 bytes. The
// server's WebSocket also refuses frames above this size (maxPayload).
export const MAX_CLIENT_MESSAGE_BYTES = 256;

// A parsed, valid message, or null for anything else: not JSON, not an object, an unknown
// kind, a missing or wrong-typed field, or a number outside its range.
export function parseClientMessage(text: string): ClientMessage | null {
  if (text.length > MAX_CLIENT_MESSAGE_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const fields = value as Record<string, unknown>;
  switch (fields.kind) {
    case 'player':
    case 'spectator':
      return { kind: fields.kind };
    case 'input':
      return parseInput(fields);
    case 'action':
      return parseAction(fields);
    default:
      return null;
  }
}

function parseInput(fields: Record<string, unknown>): ClientMessage | null {
  const { dx, dy } = fields;
  if (!isUnitComponent(dx) || !isUnitComponent(dy)) return null;
  return { kind: 'input', dx, dy };
}

function parseAction(fields: Record<string, unknown>): ClientMessage | null {
  const action = fields.action;
  if (action !== 'steal' && action !== 'secure' && action !== 'swap') return null;
  return { kind: 'action', action };
}

// A direction component: a finite number in [-1, 1]. The server clamps the magnitude.
function isUnitComponent(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= -1 && n <= 1;
}
