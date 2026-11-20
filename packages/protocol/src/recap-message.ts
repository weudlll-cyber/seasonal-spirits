// Seasonal Sumo — the reader for the match recap (`ServerRecap`), the one server text message
// longer than a few fields; parseServerMessage hands it the parsed object. Every field is
// checked for type and range; anything else drops the whole recap (THREATS row 33).

import { isIntIn, isObject } from './checks.js';
import type { ServerRecap } from './messages.js';

// 32 players with the result, their times out and the awards stay near 2 KB; this bounds anything
// bigger.
export const MAX_RECAP_BYTES = 4096;
const MAX_PLAYERS = 64;
const MAX_AWARDS = 8; // two per mode today
const MAX_COUNT = 65535; // a score per team or player
// An award's value or a player's time out: at most an hour in ms; 0 lives left is one.
const MAX_VALUE = 3_600_000;
const KIND = /^[a-z-]{1,16}$/; // an award kind; the client shows the kinds it knows

export function readRecap(fields: Record<string, unknown>): ServerRecap | null {
  const { teams, left, knockedOut, winner, players, awards } = fields;
  if (!isFour(teams) || !isFour(left)) return null;
  // Each team at most once, in the order it went out.
  const out = knockedOut;
  if (!Array.isArray(out) || !out.every(isTeam) || new Set(out).size !== out.length) return null;
  if (winner !== null && !isTeam(winner)) return null;
  const read = list(players, MAX_PLAYERS, readPlayer);
  const won = list(awards, MAX_AWARDS, readAward);
  if (!read || !won) return null;
  return { kind: 'recap', teams, left, knockedOut: out, winner, players: read, awards: won };
}

function isFour(v: unknown): v is [number, number, number, number] {
  return Array.isArray(v) && v.length === 4 && v.every(isCount);
}

function isTeam(v: unknown): v is number {
  return isIntIn(v, 0, 3);
}

// A bounded array whose every item reads; null if any does not.
function list<T>(
  v: unknown,
  max: number,
  read: (o: Record<string, unknown>) => T | null,
): T[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const out: T[] = [];
  for (const item of v) {
    const r = isObject(item) ? read(item) : null;
    if (r === null) return null;
    out.push(r);
  }
  return out;
}

function readPlayer(p: Record<string, unknown>): ServerRecap['players'][number] | null {
  const { ghost, team, score, outMs } = p;
  if (!isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3) || !isCount(score)) return null;
  // When it went out: a match time, or null while still in.
  const out = outMs === null ? null : isIntIn(outMs, 0, MAX_VALUE) ? outMs : undefined;
  if (out === undefined) return null;
  return { ghost, team, score, outMs: out };
}

function readAward(a: Record<string, unknown>): ServerRecap['awards'][number] | null {
  const { kind, ghost, value } = a;
  if (typeof kind !== 'string' || !KIND.test(kind)) return null;
  return isIntIn(ghost, 0, 255) && isIntIn(value, 0, MAX_VALUE) ? { kind, ghost, value } : null;
}

function isCount(v: unknown): v is number {
  return isIntIn(v, 0, MAX_COUNT);
}
