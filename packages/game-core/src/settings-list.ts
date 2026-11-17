// Seasonal Sumo — the settings themselves (NIGHT 2026-11-18, piece 3): every number that shapes
// play, one entry each, by group, with its label, unit, range, step, default, its modes and
// whether it applies now or from the next match. The schema's shape, the reader and the numbers
// that are not settings are settings.ts. All placeholders the owner sets in the admin panel.

import type { GameMode } from './config.js';
import type { Setting, SettingGroup } from './settings.js';

type Entry<K extends string> = Omit<Setting, 'group'> & { key: K };
type More = { modes?: readonly GameMode[]; apply?: 'now' | 'next'; value?: number };
// unit, min, max, step, default
type Spec = [unit: string, min: number, max: number, step: number, value: number];

const ALL: readonly GameMode[] = ['sumo', 'hill', 'bomb'];
const SUMO = { modes: ['sumo'] } as const;
const HILL = { modes: ['hill'] } as const;
const BOMB = { modes: ['bomb'] } as const;
const ENDGAME = { modes: ['sumo', 'hill'] } as const;
const NEXT = { apply: 'next' } as const;
const SWITCH = ['off', 'on'] as const;
export const ROTATION_SLOTS = [
  'off',
  'Sumo',
  'Sumo · Points',
  'Sumo · Last One Standing',
  'King of the Season',
  'Halving Bomb',
] as const;

// A number; its key keeps its literal type, so Settings has exactly the schema's keys.
const n = <K extends string>(key: K, label: string, spec: Spec, more: More = {}): Entry<K> => {
  const [unit, min, max, step, value] = spec;
  return {
    key,
    label,
    unit,
    min,
    max,
    step,
    default: value,
    modes: more.modes ?? ALL,
    apply: more.apply ?? 'now',
  };
};

// A choice: the value is the option's index (default more.value, else the first).
const choice = <K extends string>(
  key: K,
  label: string,
  choices: readonly string[],
  more: More = {},
): Entry<K> => ({
  ...n(key, label, ['', 0, choices.length - 1, 1, more.value ?? 0], more),
  choices,
});

const rotation = <K extends `rotation${number}`>(key: K, value: number): Entry<K> =>
  choice(key, `Match ${key.slice('rotation'.length)}`, ROTATION_SLOTS, { ...NEXT, value });

const inGroup = <E extends Entry<string>>(group: SettingGroup, entries: readonly E[]) =>
  entries.map((e) => ({ ...e, group }));

export const SETTINGS = [
  ...inGroup('general', [
    n('teamSize', 'Team size (seats bots fill)', ['seats', 1, 12, 1, 8], NEXT),
    n('ghostRadius', 'Ghost size (radius)', ['u', 8, 32, 1, 16], NEXT),
    n('maxSpeed', 'Walking speed', ['u/s', 120, 480, 10, 240]),
    n('acceleration', 'Acceleration', ['u/s²', 300, 3000, 50, 900]),
    n('friction', 'Friction (speed lost per second)', ['/s', 0.5, 6, 0.1, 2.5]),
    n('dashSpeed', 'Dash strength', ['u/s', 160, 1200, 10, 480]),
    n('dashTime', 'Dash: knocks for', ['s', 0.05, 0.6, 0.05, 0.25]),
    n('dashCooldown', 'Dash: cooldown', ['s', 0.3, 5, 0.1, 1.5]),
    n('knockSpeed', 'Push strength (a dash hit)', ['u/s', 0, 960, 10, 320]),
    n('knockWeight', 'Thrown ghost weight', ['×', 1, 20, 1, 10]),
    n('restitution', 'Bounce', ['share', 0, 1, 0.05, 0]),
    n('inSeasonPush', 'In-season push factor', ['×', 1, 2, 0.05, 1.25]),
    choice('jump', 'Jump', SWITCH, { value: 1 }),
    n('jumpAir', 'Jump: time in the air', ['s', 0.2, 1.5, 0.05, 0.5]),
    n('jumpCooldown', 'Jump: cooldown', ['s', 0.5, 5, 0.1, 3]),
    n('jumpSteer', 'Jump: steering left in the air', ['share', 0, 1, 0.05, 0.1]),
    n('fall', 'Fall animation', ['s', 0.2, 1.5, 0.1, 0.6]),
    n('respawn', 'Respawn delay (from the fall)', ['s', 0.5, 10, 0.5, 3]),
    n('protect', 'Spawn protection', ['s', 0, 5, 0.1, 1]),
    n('credit', 'Knockout credit window', ['s', 0.5, 10, 0.5, 3]),
    n('respawnInner', 'Respawn band: from (share of radius)', ['share', 0, 1, 0.05, 0.25]),
    n('respawnOuter', 'Respawn band: to (share of radius)', ['share', 0, 1, 0.05, 0.75]),
    n('startSpread', 'Start ring (share of radius)', ['share', 0.2, 0.9, 0.05, 0.6], NEXT),
    n('edgeEase', 'Edge easing after a halving', ['s', 0.5, 5, 0.1, 2]),
    n('countdown', 'Countdown before a deadline', ['s', 3, 20, 1, 10], ENDGAME),
    n('resultPause', 'Result pause', ['s', 3, 60, 1, 15], NEXT),
    n('reconnectGrace', 'Reconnect grace', ['s', 0, 60, 1, 12]),
  ]),
  ...inGroup('bots', [
    n('botReactionMin', 'Reaction: fastest', ['s', 0.1, 1, 0.05, 0.25]),
    n('botReactionMax', 'Reaction: slowest', ['s', 0.1, 1.5, 0.05, 0.45]),
    n('botJitter', 'Reaction: ± per decision', ['s', 0, 0.2, 0.01, 0.05]),
    n('botAimNoise', 'Aim noise', ['°', 0, 30, 1, 6]),
    n('botFormMin', 'Form: weakest', ['×', 0.5, 1, 0.05, 0.85]),
    n('botFormMax', 'Form: best', ['×', 1, 1.5, 0.05, 1.15]),
    n('botFormStep', 'Form: largest step', ['×', 0, 0.3, 0.01, 0.06]),
    n('botFormEvery', 'Form: drifts every', ['s', 1, 20, 1, 5]),
    n('botDashChance', 'Dash chance taken', ['share', 0, 1, 0.05, 0.6]),
    n('botDashGap', 'Least time between dashes', ['s', 0.5, 10, 0.5, 3]),
    n('botHesitateChance', 'Hesitation chance per decision', ['share', 0, 0.02, 0.001, 0.002]),
    n('botHesitate', 'Hesitation', ['s', 0, 2, 0.1, 0.4]),
    n('botJumpChance', 'Jump over a dash at it', ['share', 0, 1, 0.05, 0.5]),
    n('botDashRange', 'Dash range', ['u', 60, 400, 10, 220]),
    n('botDashAim', 'Dash only when lined up (cosine)', ['cos', 0, 1, 0.05, 0.9]),
    n('botWander', 'Wander point moves every', ['s', 0.5, 10, 0.5, 3]),
    n('botApproach', 'Approach from the side (share of dash range)', ['share', 0, 1, 0.05, 0.25]),
    n('botLead', 'Endgame: aim ahead', ['s', 0, 1, 0.05, 0.3], ENDGAME),
    n('botBoldAt', 'Endgame: bold below this many left', ['ghosts', 2, 32, 1, 8], ENDGAME),
    n('botBoldAim', 'Endgame: widest dash angle (cosine)', ['cos', -1, 1, 0.05, 0.5], ENDGAME),
    n('botCommit', 'Endgame: attack anyway after', ['s', 0.5, 10, 0.5, 3], ENDGAME),
  ]),
  ...inGroup('sumo', [
    n('sumoMatch', 'Match length', ['s', 60, 600, 15, 300], { ...SUMO, ...NEXT }),
    n('sumoSeason', 'Season length (a halving each)', ['s', 15, 150, 5, 75], { ...SUMO, ...NEXT }),
    n('arenaRadius', 'Arena size at the start (radius)', ['u', 160, 960, 10, 400], SUMO),
    n('sumoShrink', 'Each halving: radius ×', ['×', 0.5, 0.95, 0.01, 0.71], SUMO),
    n('lives', 'Lives', ['lives', 1, 9, 1, 3], { ...SUMO, ...NEXT }),
    choice('variant', 'Variant', ['Points', 'Last One Standing', 'Alternate'], {
      ...SUMO,
      ...NEXT,
    }),
    choice(
      'afterLast',
      'After the last season',
      ['Stop, time limit', 'Keep halving', 'Stop, no time limit'],
      SUMO,
    ),
    n('halvingEvery', 'Keep halving every', ['s', 30, 120, 5, 75], SUMO),
    n('botEdgeMargin', 'Bots: edge margin', ['u', 0, 300, 10, 140], SUMO),
    n(
      'botEdgeShare',
      'Bots: edge margin at most (share of radius)',
      ['share', 0.1, 1, 0.05, 0.35],
      SUMO,
    ),
    n('botEdgeSlack', 'Bots: own margin from (share of it)', ['share', 0.2, 1, 0.05, 0.6], SUMO),
  ]),
  ...inGroup('hill', [
    n('hillMatch', 'Match length', ['s', 60, 600, 15, 180], { ...HILL, ...NEXT }),
    n('hillJump', 'Zone jump interval', ['s', 15, 120, 5, 45], { ...HILL, ...NEXT }),
    n('hillWall', 'Field size (half its side)', ['u', 400, 900, 10, 700], { ...HILL, ...NEXT }),
    n('zoneRadius', 'Zone size at the start (radius)', ['u', 100, 500, 10, 300], {
      ...HILL,
      ...NEXT,
    }),
    n('zoneShrink', 'Each jump: zone radius ×', ['×', 0.5, 1, 0.01, 0.71], HILL),
    n('hillRate', 'Points per second in the zone', ['pts/s', 1, 5, 1, 1], HILL),
    n('bounce', 'Bounce: pushed out within', ['s', 0.2, 3, 0.1, 1], HILL),
    n(
      'botHold',
      'Bots: hold a spot within (share of the zone)',
      ['share', 0.1, 1, 0.05, 0.5],
      HILL,
    ),
  ]),
  ...inGroup('bomb', [
    n('bombMatch', 'Match length', ['s', 60, 600, 15, 180], { ...BOMB, ...NEXT }),
    n('bombBlast', 'Blast interval', ['s', 10, 60, 5, 20], { ...BOMB, ...NEXT }),
    n('bombWall', 'Field size (half its side)', ['u', 400, 900, 10, 700], { ...BOMB, ...NEXT }),
    n('bombCountdown', 'Countdown before a blast', ['s', 2, 10, 1, 5], BOMB),
    n('perBomb', 'Players per bomb', ['players', 2, 16, 1, 8], BOMB),
    n('passBack', 'No pass back for', ['s', 0, 3, 0.1, 1], BOMB),
    n('blastShare', 'A blast takes (share of the points)', ['share', 0, 1, 0.05, 0.5], BOMB),
    n('bombRate', 'Points per second', ['pts/s', 1, 5, 1, 1], BOMB),
    n('botFlee', 'Bots: flee a carrier within (dash ranges)', ['×', 0.5, 4, 0.25, 2], BOMB),
    n(
      'botMiddlePull',
      'Bots: bend towards the middle when fleeing',
      ['share', 0, 1, 0.05, 0.6],
      BOMB,
    ),
  ]),
  ...inGroup('rotation', [
    rotation('rotation1', 1),
    rotation('rotation2', 0),
    rotation('rotation3', 0),
    rotation('rotation4', 0),
    rotation('rotation5', 0),
    rotation('rotation6', 0),
  ]),
];
