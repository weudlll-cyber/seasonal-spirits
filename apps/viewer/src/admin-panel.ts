// Seasonal Sumo — the admin panel in the viewer (NIGHT 2026-11-18; rebuilt around one flow:
// choose the game, see and set its values, start). Two tabs:
// - "Next match" (opens first): four games to choose from; then a draft of that game's values —
//   copied from the settings in force, only the shared groups and the game's own (admin-form.ts),
//   presets read into it or saved from it — which changes nothing until "Start <game>" sends the
//   game and the draft in one request, with "keep playing this game";
// - "Running match": the running game's name and time left and its values live — 'now' rows at
//   once, 'next' rows from the next match —, the rotation, presets loaded into it.
// It talks to one server endpoint (admin-api.ts), which decides who may; shown only when that
// endpoint answers (DEV_TUNING today). Scrolls inside the window at any size (index.html); folds to
// a small tab that is remembered (panel-fold.ts).

import {
  STARTABLE_GAMES,
  startableGame,
  type GameMode,
  type Settings,
} from '@seasonal-spirits/game-core';
import { PRESET_NAME, STATE_OPEN_END, type ServerState } from '@seasonal-spirits/protocol';
import { clientConfig, matchName, mmss, modeOf } from '@seasonal-spirits/render';
import { call, type AdminView, type Command } from './admin-api.js';
import { button, el, settingsForm, type Form } from './admin-form.js';
import { foldable } from './panel-fold.js';

const SEND_GAP_MS = 100; // a dragged slider sends the newest settings at most this often
const HEADER_EVERY_MS = 500; // the running match's name and time left

type Send = (c: Command) => Promise<AdminView | null>;

// A presets row: a name to save under, the saved ones to use or delete.
function presetRow(
  send: Send,
  use: { label: string; action: 'load' | 'read' },
  draft: (() => Settings) | null,
): { root: HTMLElement; show: (names: string[]) => void } {
  const root = el('div');
  root.className = 'presets';
  const name = el('input');
  Object.assign(name, { placeholder: 'preset name', maxLength: 32 });
  const list = el('select');
  root.append(
    el('h3', 'Presets'),
    name,
    button(draft ? 'Save the draft' : 'Save', () => {
      if (!PRESET_NAME.test(name.value)) return;
      void send({ action: 'save', name: name.value, ...(draft ? { settings: draft() } : {}) });
    }),
    list,
    button(use.label, () => {
      if (list.value) void send({ action: use.action, name: list.value });
    }),
    button('Delete', () => {
      if (list.value) void send({ action: 'delete', name: list.value });
    }),
  );
  return {
    root,
    show: (names) => {
      list.replaceChildren(...names.map((n) => new Option(n, n)));
    },
  };
}

function keepSwitch(onChange: (on: boolean) => void): HTMLInputElement {
  const box = el('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    onChange(box.checked);
  });
  return box;
}

function labelled(text: string, input: HTMLElement): HTMLElement {
  const row = el('label');
  row.className = 'switch';
  row.append(input, el('span', text));
  return row;
}

interface Shared {
  view: () => AdminView;
  send: Send;
  showTab: (tab: 'next' | 'running') => void;
}

// "Start <game>" and "keep playing this game": the game and the draft in one request; then the
// running match's tab.
function startRow(p: Shared, game: string, draft: () => Settings | null): HTMLElement[] {
  const keep = el('input');
  keep.type = 'checkbox';
  keep.checked = p.view().keep;
  const start = button(`Start ${game}`, () => {
    const settings = draft();
    if (!settings) return;
    void p.send({ action: 'start', game, settings, keep: keep.checked }).then((v) => {
      if (v) p.showTab('running');
    });
  });
  start.className = 'start';
  return [start, labelled('Keep playing this game', keep)];
}

// "Next match": choose, set, start.
function nextMatchTab(p: Shared): { root: HTMLElement; answered: (v: AdminView) => void } {
  const root = el('section');
  root.dataset.tab = 'next';
  const games = el('div');
  games.className = 'games';
  const body = el('div');
  let draft: Settings | null = null;
  let form: Form | null = null;
  const presets = presetRow(
    p.send,
    { label: 'Load into the draft', action: 'read' },
    () => draft ?? p.view().current,
  );
  const choose = (name: string, mode: GameMode): void => {
    for (const b of games.children) b.classList.toggle('chosen', b.textContent === name);
    draft = { ...p.view().current };
    form = settingsForm({
      tab: 'next',
      mode,
      rotation: false,
      edit: (key, value) => {
        if (!draft) return;
        draft = { ...draft, [key]: value };
        form?.show(draft);
      },
    });
    form.show(draft);
    body.replaceChildren(
      el('h3', `2. ${name}: its values`),
      form.root,
      presets.root,
      el('h3', '3. Start'),
      ...startRow(p, name, () => draft),
    );
  };
  for (const name of STARTABLE_GAMES) {
    const game = startableGame(name);
    if (game)
      games.append(
        button(name, () => {
          choose(name, game.mode);
        }),
      );
  }
  root.append(el('h3', '1. Choose the game'), games, body);
  return {
    root,
    answered: (v) => {
      presets.show(v.presets);
      if (v.preset && draft && form) {
        draft = v.preset;
        form.show(draft);
      }
    },
  };
}

// "Running match": the running game, its values live, the rotation, presets into it.
function runningTab(
  p: Shared,
  latest: () => ServerState | undefined,
): { root: HTMLElement; answered: (v: AdminView) => void } {
  const root = el('section');
  root.dataset.tab = 'running';
  const head = el('p');
  head.className = 'running';
  const formBox = el('div');
  let wanted = p.view().current;
  let mode: GameMode | null = null;
  let form: Form | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // The newest wanted settings go out at most every SEND_GAP_MS; the answer is what holds.
  const later = (): void => {
    timer ??= setTimeout(() => {
      timer = null;
      void p.send({ action: 'apply', settings: wanted });
    }, SEND_GAP_MS);
  };
  const keep = keepSwitch((on) => {
    void p.send({ action: 'keep', on });
  });
  const presets = presetRow(p.send, { label: 'Load', action: 'load' }, null);
  // The header every HEADER_EVERY_MS; the rows again when the running game changes.
  const refresh = (): void => {
    const s = latest();
    if (!s) return;
    const left = clientConfig(s.mode, wanted).matchDurationMs - s.matchMs;
    const time = s.flags & STATE_OPEN_END ? `${mmss(s.matchMs)} played` : `${mmss(left)} left`;
    head.textContent = `${matchName(s)} · ${time}`;
    if (modeOf(s.mode) === mode) return;
    mode = modeOf(s.mode);
    form = settingsForm({
      tab: 'running',
      mode,
      rotation: true,
      edit: (key, value) => {
        wanted = { ...wanted, [key]: value };
        form?.show(wanted);
        later();
      },
    });
    form.show(wanted);
    formBox.replaceChildren(form.root);
  };
  setInterval(refresh, HEADER_EVERY_MS);
  root.append(head, labelled('Keep playing this game', keep), formBox, presets.root);
  return {
    root,
    answered: (v) => {
      wanted = v.current;
      form?.show(wanted);
      keep.checked = v.keep;
      presets.show(v.presets);
    },
  };
}

// Builds the panel into `root` once the endpoint answers; `latest` is the newest match state the
// viewer has, `onChange` hears the settings in force.
export async function startAdminPanel(
  url: string,
  root: HTMLElement,
  latest: () => ServerState | undefined,
  onChange: (s: Settings) => void,
): Promise<void> {
  const first = await call(url, null);
  if (!first) return;
  let view = first;
  const status = el('p');
  status.className = 'status';
  const tabs = el('div');
  tabs.className = 'tabs';
  const parts: { answered: (v: AdminView) => void }[] = [];
  const send: Send = async (c) => {
    const v = await call(url, c);
    status.textContent = v ? '' : 'The server refused it.';
    if (v) {
      view = v;
      for (const part of parts) part.answered(v);
      onChange(v.current);
    }
    return v;
  };
  const shared: Shared = {
    view: () => view,
    send,
    showTab: (t) => {
      show(t);
    },
  };
  const next = nextMatchTab(shared);
  const running = runningTab(shared, latest);
  parts.push(next, running);
  const tabButtons = {
    next: button('Next match', () => {
      show('next');
    }),
    running: button('Running match', () => {
      show('running');
    }),
  };
  const show = (t: 'next' | 'running'): void => {
    next.root.hidden = t !== 'next';
    running.root.hidden = t !== 'running';
    tabButtons.next.classList.toggle('active', t === 'next');
    tabButtons.running.classList.toggle('active', t === 'running');
    root.scrollTop = 0; // a tab opens at its top: the game, its name and time left
  };
  tabs.append(tabButtons.next, tabButtons.running);
  root.append(el('h2', 'Admin'), tabs, next.root, running.root, status);
  for (const part of parts) part.answered(first);
  onChange(first.current);
  show('next');
  foldable(root);
  root.hidden = false;
}
