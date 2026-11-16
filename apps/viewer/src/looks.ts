// Seasonal Spirits — the picture page of `pnpm looks` (session 2026-11-16-LOOK): draws one scene
// (apps/client/e2e/looks-scenes.ts) in one ghost look with the client's own drawing — field,
// ghosts, labels, clock from packages/render, the camera of "Near" — and a legend naming, in
// plain English, every marker the picture shows. The spec calls window.drawLook.

import {
  GHOST_BOT,
  GHOST_CARRIER,
  GHOST_SECURING,
  GHOST_SHIELDED,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  Trails,
  belowBar,
  drawClock,
  drawField,
  drawGhosts,
  follow,
  sx,
  sy,
  visibleArea,
  type GhostLook,
} from '@seasonal-spirits/render';

const SPAN = 1100; // field units along the shorter side, as the client's "Near" (cameraSpan)

interface LookScene {
  state: ServerState;
  ownId: number;
  focus: { x: number; y: number };
  history: { id: number; x: number; y: number }[][];
}

type Marker = 'carrier' | 'half' | 'shield' | 'securing' | 'own' | 'bot';

const LOOK_NAMES: Record<GhostLook, string> = {
  A: 'A — today',
  B: 'B — calm',
  C: 'C — neutral ring',
};

// One line per marker; a look without a line for a marker does not draw it.
const COMMON: Partial<Record<Marker, string>> = {
  carrier: 'Bigger body, "· 9" in the label: carrying 9 coins.',
  own: 'Thick white ring, label "You": your ghost.',
  securing: 'Thin white ring further out: securing at its shrine.',
  shield: 'Pale hexagon: swapped coins; nobody can steal them.',
};
const BY_LOOK: Record<GhostLook, Partial<Record<Marker, string>>> = {
  A: {
    carrier:
      "Ring in the season's colour, glow and trail: carrying coins; the solid part is worth full value now.",
    half: 'Dashed grey part of the ring: coins worth half now.',
    bot: 'Paler body: a bot.',
  },
  B: { half: '"(4 half)" in grey: 4 of the coins carried are worth half now.' },
  C: {
    carrier: 'White ring, glow and trail: carrying coins; the solid part is worth full value now.',
    half: 'Dashed grey part of the ring: coins worth half now.',
  },
};

function markersOf(g: GhostState, ownId: number): Marker[] {
  const m: Marker[] = [];
  if (g.flags & GHOST_CARRIER) m.push('carrier');
  if (g.offSeason > 0) m.push('half');
  if (g.flags & GHOST_SHIELDED) m.push('shield');
  if (g.flags & GHOST_SECURING) m.push('securing');
  if (g.id === ownId) m.push('own');
  if (g.flags & GHOST_BOT) m.push('bot');
  return m;
}

function legend(look: GhostLook, shown: Set<Marker>): string[] {
  const lines = [
    "Body colour: the ghost's team. Label: its name, or only its number in a crowd.",
    "Large circle with a name: a team's shrine, where coins are secured.",
  ];
  for (const m of ['carrier', 'half', 'shield', 'securing', 'own', 'bot'] as const) {
    if (!shown.has(m)) continue;
    const line = [COMMON[m], BY_LOOK[look][m]].filter((x) => x !== undefined).join(' ');
    if (line) lines.push(line);
  }
  return lines;
}

const INSET = 8; // pixels between the legend and the screen edge or the top bar
const CLEAR = 24; // pixels around the legend counted as covering a ghost

// The legend in the corner (below the bar) that covers the fewest ghosts.
function placeLegend(box: HTMLElement, top: number, ghosts: { x: number; y: number }[]): void {
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const [W, H] = [window.innerWidth, window.innerHeight];
  const corners = [
    { left: INSET, top: top + INSET },
    { left: W - INSET - w, top: top + INSET },
    { left: INSET, top: H - INSET - h },
    { left: W - INSET - w, top: H - INSET - h },
  ];
  const covered = (c: { left: number; top: number }): number =>
    ghosts.filter(
      (g) =>
        g.x > c.left - CLEAR &&
        g.x < c.left + w + CLEAR &&
        g.y > c.top - CLEAR &&
        g.y < c.top + h + CLEAR,
    ).length;
  const best = corners.reduce((a, b) => (covered(b) < covered(a) ? b : a));
  box.style.left = `${best.left}px`;
  box.style.top = `${best.top}px`;
}

function drawLook(scene: LookScene, look: GhostLook): void {
  const canvas = document.getElementById('map') as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('looks: 2D canvas context unavailable');
  const { state, ownId } = scene;
  const view = follow(ctx, CLOCK_HEIGHT, scene.focus, { span: SPAN, bottomPad: 0 });
  const trails = new Trails();
  for (const h of scene.history) {
    trails.record(h.map((p) => ({ ...p }) as GhostState));
  }
  trails.record(state.ghosts);
  const ownTeam = state.ghosts.find((g) => g.id === ownId)?.team ?? null;
  belowBar(view, () => {
    const field = { ownTeam, nowMs: 0, blocked: [], ghosts: state.ghosts };
    const shrineLabels = drawField(view, state, field);
    drawGhosts(view, state.ghosts, {
      ownId,
      season: state.season,
      trails,
      labelAll: false,
      avoid: shrineLabels.all,
      look,
    });
  });
  drawClock(ctx, state);
  const area = visibleArea(view);
  const shown = new Set<Marker>();
  for (const g of state.ghosts) {
    const [x, y] = [sx(view, g.x), sy(view, g.y)];
    if (x < area.left || x > area.right || y < area.top || y > area.bottom) continue;
    for (const m of markersOf(g, ownId)) shown.add(m);
  }
  const box = document.getElementById('legend') as HTMLDivElement;
  const title = document.createElement('b');
  title.textContent = `Look ${LOOK_NAMES[look]}`;
  const rows = legend(look, shown).map((text) => {
    const row = document.createElement('div');
    row.textContent = text;
    return row;
  });
  box.replaceChildren(title, ...rows);
  placeLegend(
    box,
    view.top,
    state.ghosts.map((g) => ({ x: sx(view, g.x), y: sy(view, g.y) })),
  );
}

(window as unknown as { drawLook: typeof drawLook }).drawLook = drawLook;
