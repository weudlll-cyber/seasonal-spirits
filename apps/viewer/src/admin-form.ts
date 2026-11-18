// Seasonal Sumo — the admin panel's values form, generated from the game's one settings schema
// (game-core settings.ts; moved out of admin-panel.ts in the panel rebuild): one row per setting
// with its unit and whether it applies now or from the next match, only the rows of one game,
// in the schema's groups — collapsible, their open or closed state remembered — each with a
// Reset to the schema's defaults. Both tabs of the panel use it.

import {
  DEFAULT_SETTINGS,
  GROUP_LABELS,
  SETTINGS,
  SETTING_GROUPS,
  type GameMode,
  type Setting,
  type SettingGroup,
  type Settings,
} from '@seasonal-spirits/game-core';

// A schema entry with its own key (a key of Settings).
type Entry = (typeof SETTINGS)[number];

const GAME_GROUPS: Readonly<Record<GameMode, SettingGroup>> = {
  sumo: 'sumo',
  hill: 'hill',
  bomb: 'bomb',
};
const OTHER_GAMES = new Set<SettingGroup>(Object.values(GAME_GROUPS));
const OPEN_AT_FIRST = new Set<SettingGroup>(['movement', 'dash']);
const STORE = 'seasonal-spirits.admin-open'; // localStorage, per tab and group

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}

export function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// A value as the panel shows it: a choice by name, a number with its unit.
function shown(s: Setting, v: number): string {
  if (s.choices) return s.choices[v] ?? '?';
  return `${String(Math.round(v * 1000) / 1000)} ${s.unit}`;
}

interface Control {
  row: HTMLElement;
  input: HTMLInputElement | HTMLSelectElement;
  show: (v: number) => void;
}

// One row: the label with "now" or "next match", then a slider over the range with its value,
// or the choice of its options.
function control(s: Setting): Control {
  const row = el('label');
  row.dataset.key = s.key;
  const head = el('span', s.label);
  head.append(el('small', s.apply === 'now' ? ' · now' : ' · next match'));
  const out = el('output');
  if (s.choices) {
    const input = el('select');
    input.append(...s.choices.map((text, i) => new Option(text, String(i))));
    row.append(head, input);
    return { row, input, show: (v) => (input.value = String(v)) };
  }
  const input = el('input');
  Object.assign(input, {
    type: 'range',
    min: String(s.min),
    max: String(s.max),
    step: String(s.step),
  });
  row.append(head, input, out);
  return {
    row,
    input,
    show: (v) => {
      input.value = String(v);
      out.textContent = shown(s, v);
    },
  };
}

// Open or closed as the owner left it (storage may be off or full: then the first look).
function remembered(key: string, first: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? first : v === '1';
  } catch {
    return first;
  }
}

function remember(key: string, open: boolean): void {
  try {
    localStorage.setItem(key, open ? '1' : '0');
  } catch {
    // Not remembered; the panel works the same.
  }
}

export interface FormOptions {
  tab: string; // whose open groups are remembered
  mode: GameMode; // the game whose rows show
  rotation: boolean; // the Rotation group too
  edit: (key: Entry['key'], value: number) => void;
}

export interface Form {
  root: HTMLElement;
  show: (s: Settings) => void;
}

// The groups for `mode`: the shared ones and its own (open at first: Movement, Dash & push and
// the game's), every row of another game hidden; editing a row or a Reset calls `edit`.
export function settingsForm(o: FormOptions): Form {
  const own = GAME_GROUPS[o.mode];
  const groups = SETTING_GROUPS.filter((g) =>
    g === 'rotation' ? o.rotation : !OTHER_GAMES.has(g) || g === own,
  );
  const controls: [Entry, Control][] = [];
  const boxes = groups.map((g) => {
    const mine = SETTINGS.filter((s) => s.group === g && s.modes.includes(o.mode));
    const box = el('details');
    box.dataset.group = g;
    const key = `${STORE}.${o.tab}.${g}`;
    box.open = remembered(key, OPEN_AT_FIRST.has(g) || g === own);
    box.addEventListener('toggle', () => {
      remember(key, box.open);
    });
    box.append(el('summary', GROUP_LABELS[g]));
    for (const s of mine) {
      const c = control(s);
      c.input.addEventListener('input', () => {
        o.edit(s.key, Number(c.input.value));
      });
      controls.push([s, c]);
      box.append(c.row);
    }
    box.append(
      button(`Reset ${GROUP_LABELS[g]}`, () => {
        for (const s of mine) o.edit(s.key, DEFAULT_SETTINGS[s.key]);
      }),
    );
    return box;
  });
  const root = el('div');
  root.append(...boxes);
  return {
    root,
    show: (s) => {
      for (const [e, c] of controls) c.show(s[e.key]);
    },
  };
}
