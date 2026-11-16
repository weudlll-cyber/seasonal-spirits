// Seasonal Spirits — the three scenes of `pnpm looks` (session 2026-11-16-LOOK), found in seeded
// bot matches: (1) the biggest crowd at a shrine, (2) a carrier of full- and half-value coins
// just after a halving among empty ghosts, (3) a shielded carrier, a securing ghost and a third
// ghost (the "own" one) close together. Each scene is the match state as a client receives it
// (the server's toWire), with the last positions for the trails.

import {
  DEFAULT_CONFIG,
  botRoster,
  carriesShielded,
  shrinePositions,
  simulate,
  totalCount,
  type Ghost,
  type MatchState,
} from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { toWire } from '../../server/src/wire.js';

export const LOOK_SEEDS = [1, 2, 3, 4, 5]; // every scene takes the best moment of these matches
const NEAR = 250; // field units: "close together", "next to"
const APART = 70; // field units: two ghosts this far apart are drawn apart in "Near"
const HALVING_WINDOW_MS = 8000; // "just after a halving": this long into the new season
const TRAIL_TICKS = 12; // render's Trails keeps this many points

type Point = { id: number; x: number; y: number };

export interface LookScene {
  key: 'crowd' | 'halved' | 'shield';
  seed: number;
  matchMs: number;
  state: ServerState;
  ownId: number;
  focus: { x: number; y: number }; // the camera's centre
  history: Point[][]; // ghost positions of the ticks before, oldest first
}

interface Moment {
  score: number;
  ownId: number;
  focus: { x: number; y: number };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// The ghost nearest to `at` among those not excluded: the "own" ghost of a scene.
function nearestOther(
  s: Readonly<MatchState>,
  at: { x: number; y: number },
  not: number[],
): Ghost | null {
  let best: Ghost | null = null;
  for (const g of s.ghosts) {
    if (not.includes(g.id)) continue;
    if (!best || dist(g, at) < dist(best, at)) best = g;
  }
  return best;
}

// (1) The most ghosts within twice a shrine's radius of one shrine.
function crowd(s: Readonly<MatchState>): Moment | null {
  const shrines = shrinePositions(DEFAULT_CONFIG);
  let best: Moment | null = null;
  for (const p of shrines) {
    const n = s.ghosts.filter((g) => dist(g, p) <= 2 * DEFAULT_CONFIG.shrineRadius).length;
    const own = nearestOther(s, p, []);
    if (own && (!best || n > best.score)) best = { score: n, ownId: own.id, focus: p };
  }
  return best;
}

// (2) Just after a halving: a ghost carrying coins of the new season and of the old one, the
// more empty ghosts next to it the better.
function halved(s: Readonly<MatchState>): Moment | null {
  const into = DEFAULT_CONFIG.seasonDurationMs - s.clock.timeLeftMs;
  if (s.clock.index < 1 || into > HALVING_WINDOW_MS) return null;
  let best: Moment | null = null;
  for (const g of s.ghosts) {
    const total = totalCount(g.carried);
    const now = g.carried[s.clock.current];
    if (now === 0 || now === total) continue;
    const empty = s.ghosts.filter((o) => totalCount(o.carried) === 0 && dist(o, g) <= NEAR);
    const own = empty[0];
    const score = empty.length * 100 + total;
    if (own && empty.length >= 2 && (!best || score > best.score)) {
      best = { score, ownId: own.id, focus: g };
    }
  }
  return best;
}

// (3) A shielded carrier and a securing ghost within NEAR, and a third ghost near both, no two
// closer than APART (the camera of "Near" shows touching ghosts as one blot); the closer the
// three, the better.
function shielded(s: Readonly<MatchState>): Moment | null {
  let best: Moment | null = null;
  for (const a of s.ghosts.filter(carriesShielded)) {
    for (const b of s.ghosts) {
      if (b.id === a.id || b.securingUntilMs === null || !apart(a, b)) continue;
      const m = withOwn(s, a, b);
      if (m && (!best || m.score > best.score)) best = m;
    }
  }
  return best;
}

// The third ghost apart from both `a` and `b` and nearest to their middle.
function withOwn(s: Readonly<MatchState>, a: Ghost, b: Ghost): Moment | null {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let best: Moment | null = null;
  for (const own of s.ghosts) {
    if (own.id === a.id || own.id === b.id || !apart(own, a) || !apart(own, b)) continue;
    const score = -(dist(a, b) + dist(own, mid));
    if (!best || score > best.score) best = { score, ownId: own.id, focus: mid };
  }
  return best;
}

// Close together, yet drawn apart.
function apart(a: Ghost, b: Ghost): boolean {
  const d = dist(a, b);
  return d >= APART && d <= NEAR;
}

const FINDERS = { crowd, halved, shield: shielded } as const;

function wireOf(s: Readonly<MatchState>, ownId: number): ServerState {
  const teams = [0, 1, 2, 3].map((t) =>
    s.ghosts.filter((g) => g.team === t).reduce((sum, g) => sum + g.securedValue, 0),
  );
  const wire = toWire(s, {
    cfg: DEFAULT_CONFIG,
    result: { players: [], teams },
    isBot: (id) => id !== ownId,
    events: [],
    nextMatchMs: 0,
  });
  return { ...wire, tick: s.tick, serverMs: s.elapsedMs };
}

// Every scene at its best moment over LOOK_SEEDS.
export function findScenes(): LookScene[] {
  const best = new Map<LookScene['key'], { score: number; scene: LookScene }>();
  for (const seed of LOOK_SEEDS) {
    const history: Point[][] = [];
    simulate(DEFAULT_CONFIG, seed, botRoster(32), (s) => {
      for (const [key, find] of Object.entries(FINDERS) as [LookScene['key'], typeof crowd][]) {
        const m = find(s);
        const old = best.get(key);
        if (!m || (old && old.score >= m.score)) continue;
        const scene = {
          key,
          seed,
          matchMs: s.elapsedMs,
          state: wireOf(s, m.ownId),
          ownId: m.ownId,
          focus: { x: m.focus.x, y: m.focus.y },
          history: history.map((h) => [...h]),
        };
        best.set(key, { score: m.score, scene });
      }
      history.push(s.ghosts.map((g) => ({ id: g.id, x: g.x, y: g.y })));
      if (history.length > TRAIL_TICKS) history.shift();
    });
  }
  return (['crowd', 'halved', 'shield'] as const).map((k) => {
    const found = best.get(k);
    if (!found) throw new Error(`no ${k} scene in seeds ${LOOK_SEEDS.join(', ')}`);
    return found.scene;
  });
}
