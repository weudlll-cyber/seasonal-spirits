// Seasonal Sumo — the reader for the match recap (`ServerRecap`), the one server text message
// longer than a few fields; parseServerMessage hands it the parsed object. Every field is
// checked for type and range; anything else drops the whole recap (THREATS row 33).

import { isIntIn, isObject } from './checks.js';
import type { ServerRecap } from './messages.js';

// 32 players with the result and the awards stay near 1.5 KB; this bounds anything bigger.
export const MAX_RECAP_BYTES = 4096;
const MAX_PLAYERS = 64;
const MAX_COUNT = 65535; // knockouts per team or player
const MAX_MS = 3_600_000;

export function readRecap(fields: Record<string, unknown>): ServerRecap | null {
  const { teams, players, awards } = fields;
  if (!Array.isArray(teams) || teams.length !== 4 || !teams.every(isCount)) return null;
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
  const { ghost, team, knockouts } = p;
  if (!isIntIn(ghost, 0, 255) || !isIntIn(team, 0, 3) || !isCount(knockouts)) return null;
  return { ghost, team, knockouts };
}

type Awards = ServerRecap['awards'];

// Each award is optional; one that is present must be whole, or the recap is dropped.
function readAwards(a: unknown): Awards | null {
  if (!isObject(a)) return null;
  const read = [optional(a.bestPusher, readPusher), optional(a.survivor, readSurvivor)] as const;
  if (read.includes(null)) return null;
  const [bestPusher, survivor] = read;
  const out: Awards = {};
  if (bestPusher) out.bestPusher = bestPusher;
  if (survivor) out.survivor = survivor;
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

function readPusher(o: Record<string, unknown>): Awards['bestPusher'] | null {
  const { ghost, knockouts } = o;
  return isIntIn(ghost, 0, 255) && isIntIn(knockouts, 1, MAX_COUNT) ? { ghost, knockouts } : null;
}

function readSurvivor(o: Record<string, unknown>): Awards['survivor'] | null {
  const { ghost, ms } = o;
  return isIntIn(ghost, 0, 255) && isIntIn(ms, 0, MAX_MS) ? { ghost, ms } : null;
}

function isCount(v: unknown): v is number {
  return isIntIn(v, 0, MAX_COUNT);
}
