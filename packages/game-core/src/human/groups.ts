// Seasonal Spirits — groups at the shrines (session 2026-11-16-HUMAN, owner's observation: a
// group of about eight just below the own shrine, carriers with 6–7 coins, dissolving late).
// Watches a match tick by tick: more than GROUP_MIN ghosts within twice a shrine's radius is
// a group; each group lasts from the first tick to the last tick with that many.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { totalCount } from '../seasons.js';
import type { MatchState } from '../types.js';

const GROUP_MIN = 5; // "more than 4 ghosts"

export interface ShrineGroup {
  shrineTeam: number;
  startMs: number; // match time when it formed
  seasonLeftMs: number; // time left in the season then: how close the next deadline was
  ms: number; // how long it lasted
  peak: number; // most ghosts at once
  // At its peak: who, what they carried, how many were securing.
  byStrategy: Record<string, number>;
  ownTeam: number; // of the shrine's own team
  carried: number[];
  securing: number;
}

export class ShrineGroups {
  readonly groups: ShrineGroup[] = [];
  private readonly open = new Map<number, { startMs: number; peak: ShrineGroup }>();

  constructor(
    private readonly cfg: GameConfig,
    private readonly strategyOf: ReadonlyMap<number, string>,
  ) {}

  observe(s: Readonly<MatchState>): void {
    s.shrines.forEach((shrine, team) => {
      const near = s.ghosts.filter((g) => distance(g, shrine) <= 2 * this.cfg.shrineRadius);
      const running = this.open.get(team);
      if (near.length < GROUP_MIN || s.ended) {
        if (running) this.close(team, running, s.elapsedMs);
        return;
      }
      const now = {
        shrineTeam: team,
        startMs: running?.startMs ?? s.elapsedMs,
        seasonLeftMs: running?.peak.seasonLeftMs ?? s.clock.timeLeftMs,
        ms: 0,
        peak: near.length,
        byStrategy: countBy(near.map((g) => this.strategyOf.get(g.id) ?? 'other')),
        ownTeam: near.filter((g) => g.team === team).length,
        carried: near.map((g) => totalCount(g.carried)),
        securing: near.filter((g) => g.securingUntilMs !== null).length,
      };
      if (!running) this.open.set(team, { startMs: s.elapsedMs, peak: now });
      else if (now.peak > running.peak.peak) running.peak = now;
    });
  }

  private close(team: number, g: { startMs: number; peak: ShrineGroup }, endMs: number): void {
    this.groups.push({ ...g.peak, ms: endMs - g.startMs });
    this.open.delete(team);
  }
}

function countBy(xs: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
}
