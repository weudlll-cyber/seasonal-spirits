// Seasonal Spirits — the reader for the match recap (`ServerRecap`), the one server text message
// longer than a few fields; parseServerMessage hands it the parsed object. Every field is
// checked for type and range; anything else drops the whole recap (THREATS row 33).

import { isIntIn, isObject } from './checks.js';
import type { ServerRecap } from './messages.js';

// 32 players with the result and three awards stay near 1.5 KB; this bounds anything bigger.
export const MAX_RECAP_BYTES = 4096;
const MAX_PLAYERS = 64;
const MAX_VALUE = 32_767.5; // a secured value fits the state's u16 in halves
const MAX_LEFT_MS = 3_600_000;

export function readRecap(fields: Record<string, unknown>): ServerRecap | null {
  const { teams, players, awards } = fields;
  if (!Array.isArray(teams) || teams.length !== 4 || !teams.every(isValue)) return null;
  if (!Array.isArray(players) || players.length > MAX_PLAYERS) return null;
  const read = players.map(readPlayer);
  if (read.some((p) => p === null)) return null;
  const a = readAwards(awards);
  if (!a) return null;
  return {
    kind: 'recap',
    teams: teams as ServerRecap['teams'],
    players: read as ServerRecap['players'],
    awards: a,
  };
}

function readPlayer(p: unknown): ServerRecap['players'][number] | null {
  if (!isObject(p)) return null;
  const { ghost, team, secured } = p;
  if (!isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3) || !isValue(secured)) return null;
  return { ghost, team, secured };
}

type Awards = ServerRecap['awards'];

// Each award is optional; one that is present must be whole, or the recap is dropped.
function readAwards(a: unknown): Awards | null {
  if (!isObject(a)) return null;
  const read = [
    optional(a.biggestSteal, readSteal),
    optional(a.closestSave, readSave),
    optional(a.lastSecure, readLast),
  ] as const;
  if (read.includes(null)) return null;
  const [biggestSteal, closestSave, lastSecure] = read;
  const out: Awards = {};
  if (biggestSteal) out.biggestSteal = biggestSteal;
  if (closestSave) out.closestSave = closestSave;
  if (lastSecure) out.lastSecure = lastSecure;
  return out;
}

// undefined when absent, null when present but broken.
function optional<T>(
  v: unknown,
  read: (o: Record<string, unknown>) => T | null,
): T | null | undefined {
  if (v === undefined) return undefined;
  return isObject(v) ? read(v) : null;
}

function readSteal(o: Record<string, unknown>): Awards['biggestSteal'] | null {
  const { thief, victim, coins } = o;
  if (!isIntIn(thief, 0, 255) || !isIntIn(victim, 0, 255) || thief === victim) return null;
  return isIntIn(coins, 1, 65535) ? { thief, victim, coins } : null;
}

function readSave(o: Record<string, unknown>): Awards['closestSave'] | null {
  const { ghost, leftMs } = o;
  return isIntIn(ghost, 0, 255) && isIntIn(leftMs, 0, MAX_LEFT_MS) ? { ghost, leftMs } : null;
}

function readLast(o: Record<string, unknown>): Awards['lastSecure'] | null {
  const { ghost, value } = o;
  return isIntIn(ghost, 0, 255) && isValue(value) ? { ghost, value } : null;
}

// A secured value: whole or a half, 0 up to what the state can carry.
function isValue(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v * 2) && v >= 0 && v <= MAX_VALUE;
}
