// Seasonal Spirits — browser viewer: a spectator of the running match, as a debug view.
// Connects through the artificial delay queue, interpolates the ghosts and draws the whole
// match with the client's drawing (packages/render). The HUD shows the network numbers; they
// are also exposed on window for Playwright checks.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import {
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
  CLOCK_HEIGHT,
  Trails,
  drawClock,
  drawField,
  drawGhosts,
  fitField,
} from '@seasonal-spirits/render';

declare const __SERVER_WS_URL__: string;
declare const __SERVER_HTTP_URL__: string;

const BUFFER_MS = 100;
const LATENCY_MIN = 100;
const LATENCY_MAX = 200;

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLPreElement;
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
const jumpDetector = new JumpDetector({ speedUnitsPerSecond: DEFAULT_CONFIG.ghostSpeed });
const renderClock = new RenderClock({ bufferMs: BUFFER_MS });

const incoming = new DelayQueue<Uint8Array>(LATENCY_MIN, LATENCY_MAX, (buf) => {
  const state: ServerState = decodeState(buf);
  const now = Date.now();
  buffer.push({ receivedAt: now, state });
  trimBuffer(buffer, now, 2000);
  lastStateBytes = buf.byteLength;
  statesRate.record(now);
});

const ws = new WebSocket(__SERVER_WS_URL__);
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
    const r = await fetch(`${__SERVER_HTTP_URL__}/metrics-lite`);
    const m = (await r.json()) as { achievedHz: number };
    serverHz = m.achievedHz;
  } catch {
    // ignore; the probe may be starting up.
  }
}
setInterval(() => {
  void pollMetrics();
}, 1000);

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

  // Ghosts are interpolated; coins and clock come from the newest state.
  const latest = buffer.at(-1)?.state;
  trails.record(ghosts);
  const shrineLabels = drawField(fitField(ctx, CLOCK_HEIGHT), latest, {
    ownTeam: null,
    nowMs: 0,
    blocked: [],
    ghosts,
  });
  drawGhosts(fitField(ctx, CLOCK_HEIGHT), ghosts, {
    ownId: null,
    trails,
    labelAll: true,
    avoid: shrineLabels.all,
  });
  drawClock(ctx, latest);

  // Expose for Playwright / probe self-check.
  (window as unknown as { __viewer: unknown }).__viewer = {
    drawnGhostCount: ghosts.length,
    bufferedStates: buffer.length,
    statesPerSecond: statesRate.value(now) / 60,
    jumpsPer60s: jumpCounter.value(now),
    underrunsPer60s: underrunCounter.value(now),
    stateBytes: lastStateBytes,
    serverHz,
  };

  hud.textContent =
    `drawn ghosts:    ${ghosts.length}\n` +
    `states/s:        ${(statesRate.value(now) / 60).toFixed(1)}\n` +
    `bytes/message:   ${lastStateBytes}\n` +
    `latency:         ${LATENCY_MIN}-${LATENCY_MAX} ms (one way)\n` +
    `buffer:          ${BUFFER_MS} ms (${buffer.length} states held)\n` +
    `jumps /60 s:     ${jumpCounter.value(now)}\n` +
    `underruns /60 s: ${underrunCounter.value(now)}\n` +
    `server Hz:       ${serverHz.toFixed(1)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
