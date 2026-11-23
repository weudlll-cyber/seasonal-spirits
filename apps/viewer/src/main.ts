// Seasonal Spirits — browser viewer: a spectator of the running match as a debug view, through the
// delay queue, drawn with packages/render; network numbers in the HUD and on window (Playwright).
// Served at /viewer/ and /admin/ (apps/client vite/viewer-pages.ts); /admin/ adds the admin panel.

// The kit's look for the page (Luxora Grotesk, the tokens); Fredoka for the canvas.
import '@seasonal/kit/fonts.css';
import '@seasonal/kit/tokens.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { DEFAULT_SETTINGS, type Settings } from '@seasonal-spirits/game-core';
import {
  ADMIN_SETTINGS_PATH,
  DelayQueue,
  JumpDetector,
  PerMinuteCounter,
  RenderClock,
  decodeState,
  interpolate,
  latestServerMs,
  trimBuffer,
  type BufferedState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  BreakOff,
  Seasons,
  CLOCK_HEIGHT,
  Trails,
  bindLookSwitch,
  loadCanvasFont,
  drawClock,
  drawField,
  fieldStanding,
  drawSky,
  drawSeasonAir,
  drawFallsBehind,
  drawGhosts,
  clientConfig,
  fuseLeft,
  cameraBox,
  fitBox,
  islandOf,
  modeOf,
  scoreTopOf,
  useShape,
  zoneOf,
  type GhostStyle,
  type View,
} from '@seasonal-spirits/render';
import { startAdminPanel } from './admin-panel.js';

declare const __SERVER_PORT__: number;
declare const __ADMIN_PANEL__: boolean; // vite.config.ts: Vite's dev server only, never a build
// The match server on the page's own host (one address, chain 2026-11-21: the client's dev server
// serves this page), so it is reached the same way as the game reaches it.
const SERVER_HTTP_URL = `http://${location.hostname}:${String(__SERVER_PORT__)}`;
const SERVER_WS_URL = `ws://${location.hostname}:${String(__SERVER_PORT__)}`;
// The admin panel only at /admin/; /viewer/ is the spectating debug view alone. A build leaves the
// panel's code out (audit 2026-11-22 I1).
const ADMIN_PAGE = __ADMIN_PANEL__ && location.pathname.startsWith('/admin');

const BUFFER_MS = 100;
const LATENCY_MIN = 100;
const LATENCY_MAX = 200;

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLPreElement;
bindLookSwitch(document.getElementById('look') as HTMLButtonElement);
loadCanvasFont();
const tuningRoot = document.getElementById('tuning') as HTMLElement;
const context = canvas.getContext('2d');
if (context === null) throw new Error('viewer: 2D canvas context unavailable');
const ctx = context;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const buffer: BufferedState[] = [];
const statesRate = new PerMinuteCounter();
const jumpCounter = new PerMinuteCounter();
const underrunCounter = new PerMinuteCounter();
let lastStateBytes = 0;
const trails = new Trails();
const field = { breaks: new BreakOff(), seasons: new Seasons() };
const SWITCH_ROOM = 64; // px at the top right the clock's pill leaves to the Light/Dark switch
// The fastest a ghost moves: a dash plus a knock (a respawn still counts as a jump); with the
// settings the panel shows.
const fastest = (s: Settings): JumpDetector =>
  new JumpDetector({ speedUnitsPerSecond: s.dashSpeed + s.knockSpeed });
let settings: Settings = DEFAULT_SETTINGS;
let jumpDetector = fastest(settings);
if (ADMIN_PAGE)
  void startAdminPanel(
    `${SERVER_HTTP_URL}${ADMIN_SETTINGS_PATH}`,
    tuningRoot,
    () => buffer.at(-1)?.state,
    (s) => {
      settings = s;
      jumpDetector = fastest(s);
    },
  );
const renderClock = new RenderClock({ bufferMs: BUFFER_MS });

const incoming = new DelayQueue<Uint8Array>(LATENCY_MIN, LATENCY_MAX, (buf) => {
  const state: ServerState = decodeState(buf);
  const now = Date.now();
  buffer.push({ receivedAt: now, state });
  trimBuffer(buffer, now, 2000);
  lastStateBytes = buf.byteLength;
  statesRate.record(now);
});

const ws = new WebSocket(SERVER_WS_URL);
ws.binaryType = 'arraybuffer';
ws.onopen = () => {
  ws.send(JSON.stringify({ kind: 'spectator' }));
};
ws.onmessage = (ev) => {
  const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : null;
  if (data) incoming.push(data);
};

let serverHz = 0;
async function pollMetrics(): Promise<void> {
  try {
    const r = await fetch(`${SERVER_HTTP_URL}/metrics-lite`);
    const m = (await r.json()) as { achievedHz: number };
    serverHz = m.achievedHz;
  } catch {
    // ignore; the probe may be starting up.
  }
}
setInterval(() => {
  void pollMetrics();
}, 1000);

// How the viewer draws the characters: no own one, the mode's marks, the season's particles.
function styleOf(view: View, latest: ServerState | undefined, now: number): GhostStyle {
  return {
    ownId: null,
    trails,
    nowMs: now,
    fuse: latest ? fuseLeft(latest) : 1,
    zone: zoneOf(latest),
    scoreTop: scoreTopOf(latest),
    island: islandOf(latest),
    air: () => {
      drawSeasonAir(view, field.seasons, now);
    },
  };
}

function frame(): void {
  const now = Date.now();
  const target = renderClock.target(now, latestServerMs(buffer));
  let ghosts: ReturnType<typeof interpolate>['ghosts'] = [];
  let underrun = false;
  if (target !== null) {
    const r = interpolate(buffer, target);
    ghosts = r.ghosts;
    underrun = r.underrun;
  }
  if (underrun) underrunCounter.record(now);
  const jumps = jumpDetector.observe(now, ghosts);
  if (jumps > 0) jumpCounter.record(now, jumps);
  // Ghosts are interpolated; the field, the bombs' fuse and the clock come from the newest state.
  const latest = buffer.at(-1)?.state;
  if (latest) useShape(clientConfig(latest.mode, settings));
  trails.record(ghosts, now);
  drawSky(ctx, now, latest?.season);
  // The client's camera: the playing area as large as it goes (sumo's arena follows its halving).
  const screen = { ctx, top: CLOCK_HEIGHT, room: { keepOut: [], marginPx: 8 } };
  const view = fitBox(ctx, CLOCK_HEIGHT, cameraBox(latest, screen), screen.room);
  const style = styleOf(view, latest, now);
  const behind = (): void => {
    drawFallsBehind(view, ghosts, style);
  };
  const ground = drawField(view, latest, now, { ...field, behind });
  const standing = fieldStanding(view, latest, ground, { nowMs: now, seasons: field.seasons });
  drawGhosts(view, ghosts, { ...style, field: standing });
  drawClock(ctx, latest, SWITCH_ROOM);

  // Expose for Playwright / probe self-check.
  (window as unknown as { __viewer: unknown }).__viewer = {
    drawnGhostCount: ghosts.length,
    bufferedStates: buffer.length,
    statesPerSecond: statesRate.value(now) / 60,
    jumpsPer60s: jumpCounter.value(now),
    underrunsPer60s: underrunCounter.value(now),
    stateBytes: lastStateBytes,
    serverHz,
    gameMode: latest ? modeOf(latest.mode) : null, // the admin panel spec's started game
  };

  hud.textContent =
    `drawn ghosts:\t${ghosts.length}\n` +
    `states/s:\t${(statesRate.value(now) / 60).toFixed(1)}\n` +
    `bytes/message:\t${lastStateBytes}\n` +
    `latency:\t${LATENCY_MIN}-${LATENCY_MAX} ms (one way)\n` +
    `buffer:\t${BUFFER_MS} ms (${buffer.length} states held)\n` +
    `jumps /60 s:\t${jumpCounter.value(now)}\n` +
    `underruns /60 s:\t${underrunCounter.value(now)}\n` +
    `server Hz:\t${serverHz.toFixed(1)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
