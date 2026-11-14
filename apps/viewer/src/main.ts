// Seasonal Spirits — browser viewer. Connects as a spectator through the artificial delay
// queue and renders ghosts as coloured circles. HUD shows states/s, bytes/message, latency
// window, buffer size, jumps and underruns per 60 s, server Hz, and the drawn ghost count
// (exposed on window for Playwright checks).

import {
  DelayQueue,
  JumpDetector,
  PerMinuteCounter,
  decodeState,
  interpolate,
  trimBuffer,
  type BufferedState,
  type ServerState,
} from '@seasonal-spirits/protocol';

declare const __SERVER_WS_URL__: string;
declare const __SERVER_HTTP_URL__: string;

const WORLD = 2000;
const BUFFER_MS = 100;
const LATENCY_MIN = 100;
const LATENCY_MAX = 200;
const SPEED = 300;

// 32 distinct colours — four seasons, eight players each. Phase 0 just needs them distinct.
const SEASON_PALETTES: Record<number, string[]> = {
  0: tintShades('#AFB84E'), // Spring
  1: tintShades('#E06E22'), // Summer
  2: tintShades('#F9A825'), // Autumn
  3: tintShades('#04AAF7'), // Winter
};

function tintShades(hex: string): string[] {
  const n = 8;
  const { r, g, b } = hexToRgb(hex);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = 0.5 + (i / (n - 1)) * 0.5; // 0.5..1.0 brightness
    out.push(`rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`);
  }
  return out;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function colourFor(id: number): string {
  const season = (id - 1) % 4;
  const slot = Math.floor((id - 1) / 4) % 8;
  return SEASON_PALETTES[season]![slot]!;
}

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLPreElement;
const ctx = canvas.getContext('2d')!;

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
const jumpDetector = new JumpDetector({ speedUnitsPerSecond: SPEED });

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
setInterval(pollMetrics, 1000);

function frame(): void {
  const now = Date.now();
  const { ghosts, underrun } = interpolate(buffer, now, BUFFER_MS);
  if (underrun) underrunCounter.record(now);
  const jumps = jumpDetector.observe(now, ghosts);
  if (jumps > 0) jumpCounter.record(now, jumps);

  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width, canvas.height) / WORLD;
  const offsetX = (canvas.width - WORLD * scale) / 2;
  const offsetY = (canvas.height - WORLD * scale) / 2;

  ctx.strokeStyle = '#22303c';
  ctx.strokeRect(offsetX, offsetY, WORLD * scale, WORLD * scale);

  for (const g of ghosts) {
    ctx.fillStyle = colourFor(g.id);
    ctx.beginPath();
    ctx.arc(offsetX + g.x * scale, offsetY + g.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
  }

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
