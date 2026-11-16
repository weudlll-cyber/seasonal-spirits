// Seasonal Spirits — the picture page of `pnpm looks` (sessions 2026-11-16-LOOK and -LOOK-B):
// draws one scene (apps/client/e2e/looks-scenes.ts) with the client's own drawing — field,
// ghosts, labels, clock from packages/render, the camera of "Near" — and the legend lines of
// the help (LEGEND) for every marker the picture shows. The spec calls window.drawLook.

import {
  GHOST_CARRIER,
  GHOST_SECURING,
  GHOST_SHIELDED,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  LEGEND,
  Trails,
  belowBar,
  drawClock,
  drawField,
  drawGhosts,
  follow,
  sx,
  sy,
  visibleArea,
  type LegendMarker,
} from '@seasonal-spirits/render';

const SPAN = 1100; // field units along the shorter side, as the client's "Near" (cameraSpan)

interface LookScene {
  state: ServerState;
  ownId: number;
  focus: { x: number; y: number };
  history: { id: number; x: number; y: number }[][];
}

function markersOf(g: GhostState, ownId: number): LegendMarker[] {
  const m: LegendMarker[] = [];
  if (g.flags & GHOST_CARRIER) m.push('carrier', 'trail');
  if (g.offSeason > 0) m.push('half');
  if (g.flags & GHOST_SHIELDED) m.push('shield');
  if (g.flags & GHOST_SECURING) m.push('securing');
  if (g.id === ownId) m.push('own');
  return m;
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

function drawLook(scene: LookScene): void {
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
      trails,
      labelAll: false,
      avoid: shrineLabels.all,
    });
  });
  drawClock(ctx, state);
  const area = visibleArea(view);
  // Ghosts and shrines are in every scene.
  const shown = new Set<LegendMarker>(['team', 'shrine']);
  for (const g of state.ghosts) {
    const [x, y] = [sx(view, g.x), sy(view, g.y)];
    if (x < area.left || x > area.right || y < area.top || y > area.bottom) continue;
    for (const m of markersOf(g, ownId)) shown.add(m);
  }
  const box = document.getElementById('legend') as HTMLDivElement;
  const rows = LEGEND.filter((l) => shown.has(l.marker)).map((l) => {
    const row = document.createElement('div');
    row.textContent = l.text;
    return row;
  });
  box.replaceChildren(...rows);
  placeLegend(
    box,
    view.top,
    state.ghosts.map((g) => ({ x: sx(view, g.x), y: sy(view, g.y) })),
  );
}

(window as unknown as { drawLook: typeof drawLook }).drawLook = drawLook;
