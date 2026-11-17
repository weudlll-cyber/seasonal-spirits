// Seasonal Sumo — the jump (JUMP 2026-11-17): in the air nothing hits a ghost and it pushes
// nobody, it barely steers, its cooldown is the core's, landing outside the arena is a fall,
// the owner's switch off ignores it, and a bot jumps over a dash only after its reaction time.

import { describe, expect, it } from 'vitest';
import { createBot } from './bots/human.js';
import type { GameConfig } from './config.js';
import { act, cfg, ghost, matchOf, place } from './test-helpers.js';
import type { Intent } from './types.js';

const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];
const JUMP: Intent = { dx: 0, dy: 0, action: 'jump' };
const both = (a: Intent, b: Intent) =>
  new Map([
    [1, a],
    [2, b],
  ]);

describe('in the air', () => {
  it('a dash passes underneath: no hit, no throw, no credit', () => {
    const m = matchOf(cfg, two);
    place(m, 1, -60, 0);
    place(m, 2, 0, 0);
    m.tick(50, both({ dx: 1, dy: 0, action: 'dash' }, JUMP));
    for (let i = 0; i < 4; i++) m.tick(50, both({ dx: 1, dy: 0 }, { dx: 0, dy: 0 }));
    expect(Math.hypot(ghost(m, 2).vx, ghost(m, 2).vy)).toBeLessThan(1);
    expect(ghost(m, 2).lastTouch).toBeNull();
    expect(ghost(m, 1).x).toBeGreaterThan(ghost(m, 2).x); // it went right through
  });
});

// NIGHT 2026-11-18: "Dodged!" on every screen — decided by the server, once per jump.
describe('a dodge', () => {
  it('reports a dodge once when a dash really passes under, never without one', () => {
    const run = (dashing: boolean, jumping: boolean): number => {
      const m = matchOf(cfg, two);
      place(m, 1, -60, 0);
      place(m, 2, 0, 0);
      let n = 0;
      const first = both(
        dashing ? { dx: 1, dy: 0, action: 'dash' } : { dx: 1, dy: 0 },
        jumping ? JUMP : { dx: 0, dy: 0 },
      );
      m.tick(50, first);
      n += m.state.events.filter((e) => e.type === 'dodge' && e.ghost === 2).length;
      for (let i = 0; i < 6; i++) {
        m.tick(50, both({ dx: 1, dy: 0 }, { dx: 0, dy: 0 }));
        n += m.state.events.filter((e) => e.type === 'dodge' && e.ghost === 2).length;
      }
      return n;
    };
    expect(run(true, true)).toBe(1); // a dash under the jumper: once
    expect(run(false, true)).toBe(0); // only running under it: no dash
    expect(run(true, false)).toBe(0); // on the ground: a hit, not a dodge
  });
});

describe('in the air, pushing', () => {
  it('a jumper pushes nobody: it passes over a standing ghost', () => {
    const m = matchOf(cfg, two);
    place(m, 1, -40, 0).vx = 300;
    place(m, 2, 0, 0);
    act(m, 1, { dx: 1, dy: 0, action: 'jump' });
    for (let i = 0; i < 6; i++) act(m, 1, { dx: 1, dy: 0 });
    expect(Math.hypot(ghost(m, 2).vx, ghost(m, 2).vy)).toBe(0);
    expect(ghost(m, 2).lastTouch).toBeNull();
  });

  it('barely steers: a turn held in the air moves it a tenth as much as on the ground', () => {
    const turn = (jump: boolean): number => {
      const m = matchOf(cfg, two);
      place(m, 1, 0, 0).vx = 200;
      if (jump) act(m, 1, JUMP);
      else act(m, 1, { dx: 0, dy: 0 });
      for (let i = 0; i < 8; i++) act(m, 1, { dx: 0, dy: 1 });
      return ghost(m, 1).vy;
    };
    expect(turn(true)).toBeLessThan(turn(false) * 0.15);
    expect(turn(true)).toBeGreaterThan(0);
  });

  it('falls only when it lands outside the arena', () => {
    const m = matchOf(cfg, two);
    const r = m.state.arena.radius;
    place(m, 1, r - 30, 0).vx = 300;
    act(m, 1, { dx: 1, dy: 0, action: 'jump' });
    while (ghost(m, 1).x - m.state.arena.centre.x <= r) act(m, 1, { dx: 1, dy: 0 });
    expect(ghost(m, 1).phase).toBe('in'); // over the edge, still in the air
    while (m.state.elapsedMs < cfg.jump.airMs + 100) act(m, 1, { dx: 1, dy: 0 });
    expect(ghost(m, 1).phase).toBe('falling');
  });
});

describe('the jump action', () => {
  it('keeps its cooldown, whatever a client sends', () => {
    const m = matchOf(cfg, two);
    act(m, 1, JUMP);
    const first = ghost(m, 1).airUntilMs;
    while (m.state.elapsedMs < cfg.jump.cooldownMs - 50) act(m, 1, JUMP);
    expect(ghost(m, 1).airUntilMs).toBe(first);
    act(m, 1, { dx: 0, dy: 0 });
    act(m, 1, JUMP);
    expect(ghost(m, 1).airUntilMs).toBeGreaterThan(first);
  });

  it("does nothing with the owner's switch off", () => {
    const off: GameConfig = { ...cfg, jump: { ...cfg.jump, enabled: false } };
    const m = matchOf(off, two);
    act(m, 1, JUMP);
    expect(ghost(m, 1).airUntilMs).toBe(0);
    expect(m.state.events.some((e) => e.type === 'jump')).toBe(false);
  });
});

describe('a bot under a dash', () => {
  // A steady bot (no noise, no hesitation, average form) that always takes the jump.
  const steady = (jumpChance: number): GameConfig => ({
    ...cfg,
    bots: {
      ...cfg.bots,
      reactionMs: [300, 300],
      reactionJitterMs: 0,
      hesitateChance: 0,
      form: [1, 1],
      jumpChance,
    },
  });

  // When the bot (ghost 1) first asks to jump after ghost 2 dashes at it from 150 away at 200 ms.
  function jumpAt(c: GameConfig): number | null {
    const m = matchOf(c, two);
    place(m, 1, 0, 0);
    place(m, 2, -150, 0);
    const bot = createBot(c, 5);
    for (let t = 0; t < 1500; t += 50) {
      const mine = bot(m.state, ghost(m, 1));
      if (mine.action === 'jump') return m.state.elapsedMs;
      const at = m.state.elapsedMs === 200 ? { dx: 1, dy: 0, action: 'dash' as const } : null;
      m.tick(50, both({ dx: 0, dy: 0 }, at ?? { dx: 0, dy: 0 }));
    }
    return null;
  }

  it('jumps only after its reaction time', () => {
    const at = jumpAt(steady(1));
    expect(at).not.toBeNull();
    expect(at ?? 0).toBeGreaterThanOrEqual(250 + 300);
  });

  it('never jumps when its chance is nil', () => {
    expect(jumpAt(steady(0))).toBeNull();
  });
});
