// Seasonal Sumo — the admin panel in the viewer (NIGHT 2026-11-18, piece 3; grew out of TUNE
// 2026-11-17's sliders): generated from the game's one settings schema (game-core settings.ts) —
// one control per setting, grouped (General, Bots, Sumo, King of the Season, Halving Bomb,
// Rotation), each with its unit and whether it applies now or from the next match, Reset per
// group — and the named presets (save the current settings, load, delete). It talks to one
// server endpoint (protocol ADMIN_SETTINGS_PATH), which decides who may; shown only when that
// endpoint answers (DEV_TUNING today). Scrolls inside the window at any size (index.html).

import {
  GROUP_LABELS,
  SETTINGS,
  SETTING_GROUPS,
  readSettings,
  type Setting,
  type SettingGroup,
  type Settings,
} from '@seasonal-spirits/game-core';
import { PRESET_NAME } from '@seasonal-spirits/protocol';

// A schema entry with its own key (a key of Settings).
type Entry = (typeof SETTINGS)[number];

const SEND_GAP_MS = 100; // a dragged slider sends the newest settings at most this often

interface View {
  current: Settings;
  start: Settings;
  presets: string[];
}

type Command =
  { action: 'apply'; settings: Settings } | { action: 'save' | 'load' | 'delete'; name: string };

// The endpoint's answer, every part checked: the settings against the schema, the names.
function readView(v: unknown): View | null {
  if (typeof v !== 'object' || v === null) return null;
  const { current, start, presets } = v as Record<string, unknown>;
  const now = readSettings(current);
  const first = readSettings(start);
  const names = Array.isArray(presets) ? presets.filter((n) => typeof n === 'string') : [];
  if (!now || !first || names.some((n) => !PRESET_NAME.test(n))) return null;
  return { current: now, start: first, presets: names };
}

// GET (no command) or POST one; null when the endpoint is absent or refuses.
async function call(url: string, command: Command | null): Promise<View | null> {
  try {
    const r = await fetch(
      url,
      command
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(command),
          }
        : {},
    );
    return r.ok ? readView(await r.json()) : null;
  } catch {
    return null;
  }
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

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}

// One row: the label with "now" or "next match", then a slider over the range with its value,
// or the choice of its options.
function control(s: Setting): Control {
  const row = el('label');
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

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// The presets row: a name to save the current settings under, the saved ones to load or delete.
function presetRow(send: (c: Command) => void): {
  root: HTMLElement;
  show: (names: string[]) => void;
} {
  const root = el('div');
  root.className = 'presets';
  const name = el('input');
  Object.assign(name, { placeholder: 'preset name', maxLength: 32 });
  const list = el('select');
  const chosen = (): string => list.value;
  root.append(
    el('h3', 'Presets'),
    name,
    button('Save', () => {
      if (PRESET_NAME.test(name.value)) send({ action: 'save', name: name.value });
    }),
    list,
    button('Load', () => {
      if (chosen()) send({ action: 'load', name: chosen() });
    }),
    button('Delete', () => {
      if (chosen()) send({ action: 'delete', name: chosen() });
    }),
  );
  const show = (names: string[]): void => {
    list.replaceChildren(...names.map((n) => new Option(n, n)));
  };
  return { root, show };
}

// A group: folded but for General, its controls, and its Reset to the starting values.
function groupBox(
  g: SettingGroup,
  controls: ReadonlyMap<string, Control>,
  reset: (mine: readonly Entry[]) => void,
): HTMLElement {
  const box = el('details');
  box.open = g === 'movement';
  box.append(el('summary', GROUP_LABELS[g]));
  const mine = SETTINGS.filter((s) => s.group === g);
  box.append(...mine.map((s) => controls.get(s.key)?.row ?? el('span')));
  box.append(
    button(`Reset ${GROUP_LABELS[g]}`, () => {
      reset(mine);
    }),
  );
  return box;
}

// Builds the panel into `root` once the endpoint answers; `onChange` hears the settings in force.
export async function startAdminPanel(
  url: string,
  root: HTMLElement,
  onChange: (s: Settings) => void,
): Promise<void> {
  const first = await call(url, null);
  if (!first) return;
  let view = first;
  let wanted: Settings = first.current;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const status = el('p');
  const controls = new Map(SETTINGS.map((s) => [s.key, control(s)] as const));
  const show = (s: Settings): void => {
    for (const [key, c] of controls) c.show(s[key]);
  };
  const answered = (v: View | null): void => {
    status.textContent = v ? '' : 'The server refused it.';
    if (!v) return;
    view = v;
    wanted = v.current;
    show(v.current);
    presets.show(v.presets);
    onChange(v.current);
  };
  const send = (c: Command): void => {
    void call(url, c).then(answered);
  };
  const presets = presetRow(send);
  // The newest wanted settings go out at most every SEND_GAP_MS; the answer is what holds.
  const later = (): void => {
    timer ??= setTimeout(() => {
      timer = null;
      send({ action: 'apply', settings: wanted });
    }, SEND_GAP_MS);
  };
  for (const [key, c] of controls) {
    c.input.addEventListener('input', () => {
      wanted = { ...wanted, [key]: Number(c.input.value) };
      show(wanted);
      later();
    });
  }
  const reset = (mine: readonly Entry[]): void => {
    for (const s of mine) wanted = { ...wanted, [s.key]: view.start[s.key] };
    show(wanted);
    later();
  };
  const boxes = SETTING_GROUPS.map((g) => groupBox(g, controls, reset));
  root.append(el('h2', 'Settings'), ...boxes, presets.root, status);
  answered(first);
  root.hidden = false;
}
