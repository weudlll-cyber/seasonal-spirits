// Seasonal Spirits — the player client: joins the match, steers one ghost, shows the match.
// Development mode, no sign-in: the server gives a free slot (a bot leaves) or, when every
// slot has a player, lets the client watch. With ?spectate=1 it only watches (CONCEPT.md §5):
// the whole field, every name, the clock and the halving staging, no controls. Draws with
// packages/render (scene.ts), interpolates with packages/protocol; everything shown comes
// from the server's state, only the own ghost is drawn ahead of it by the own input
// (prediction.ts, display only).

import {
  GHOST_SECURING,
  RenderClock,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  STATE_RESULT,
  STATE_TO_END,
  interpolate,
  latestServerMs,
  type GhostState,
  type ServerRecap,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { Trails, seasonColour, seasonName } from '@seasonal-spirits/render';
import { Connection, type Mode } from './connection.js';
import { Help } from './help.js';
import { Hud, MATCH_OVER_MS, bindMute, el, hudOnField } from './hud.js';
import { bindJoystick, bindKeyboard, type Controls } from './input.js';
import { OwnPrediction, type ServerOwn } from './prediction.js';
import { PriceBoard } from './prices.js';
import { ResultScreen } from './result.js';
import { drawScene, type Drawn, type Frame } from './scene.js';
import { DeadlineTone } from './sound.js';
import { ViewToggle } from './view-mode.js';

const BUFFER_MS = 100; // render this far behind the newest state (docs/PHASE0.md)

const canvas = el('map', HTMLCanvasElement);
const context = canvas.getContext('2d');
if (context === null) throw new Error('client: 2D canvas context unavailable');
const ctx = context;
const resize = (): void => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
resize();
window.addEventListener('resize', resize);
// Joystick and touch layout when the primary pointer is a finger (a laptop with a touch screen
// and a mouse keeps the desktop layout).
document.body.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);
// Exactly "1"; anything else plays.
const spectate = new URLSearchParams(location.search).get('spectate') === '1';
document.body.classList.toggle('spectating', spectate);

const tone = new DeadlineTone();
bindMute(() => tone.toggleMute(), tone.muted);
const viewButton = el('view', HTMLButtonElement);
// A spectator by URL has no view choice (and its keys do nothing).
const viewToggle = spectate ? null : new ViewToggle(viewButton);
const teamLine = el('team');
const trails = new Trails();
const renderClock = new RenderClock({ bufferMs: BUFFER_MS }); // every ghost but the own one
const prediction = new OwnPrediction();
const result = new ResultScreen();
const prices = new PriceBoard();
let halvings = 0;
let resultFrom = 0; // performance.now() from which the result screen may show
let recap: ServerRecap | null = null; // of the match just ended, during the result pause

const NOTICES: Record<Mode, string | null> = {
  connecting: 'Connecting…',
  player: null,
  spectator: spectate ? 'Watching the match.' : null,
  closed: 'The connection to the match server is gone. Reload the page to join again.',
};

const conn = new Connection(spectate ? 'spectator' : 'player', {
  onState: (s: ServerState) => {
    if (!(s.flags & STATE_RESULT)) recap = null; // a match runs: the last recap is over
    // Each deadline event is in one state only; every state passes here, so none is missed.
    if (!(s.flags & (STATE_HALVING_EVENT | STATE_MATCH_END_EVENT))) return;
    if (s.flags & STATE_HALVING_EVENT) halvings++;
    // The result screen waits until "MATCH OVER" has been seen.
    if (s.flags & STATE_MATCH_END_EVENT) resultFrom = performance.now() + MATCH_OVER_MS;
    hud.deadline(s);
    tone.play();
  },
  onMode: (mode, reason) => {
    hud.say(
      reason === 'full'
        ? 'Every place in this match has a player — you are watching instead.'
        : NOTICES[mode],
    );
  },
  onRecap: (r) => {
    recap = r;
  },
});

const hud = new Hud((a) => {
  controls.act(a);
});
hud.say(NOTICES.connecting);
const controls: Controls = {
  steer: (dx, dy) => {
    conn.steer(dx, dy);
  },
  act: (a) => {
    conn.act(a);
  },
};
bindKeyboard(controls);
bindJoystick(el('stick'), el('knob'), controls);
new Help(el('help'), el('help-open', HTMLButtonElement));

// The moments one frame shows, in server time, for the latency measurement
// (e2e/latency.measure.ts): the drawn ghosts (render target), the newest state, the coins.
interface FrameTiming {
  frameMs: number;
  targetMs: number | null;
  latestMs: number | null;
  coinsMs: number | null;
}

// The own ghost in the newest state, as the prediction needs it; null while watching.
function ownServer(ownId: number | null): ServerOwn | null {
  const newest = conn.buffer.at(-1);
  const g = newest?.state.ghosts.find((x) => x.id === ownId);
  if (conn.mode !== 'player' || !newest || !g) return null;
  return {
    x: g.x,
    y: g.y,
    carrying: g.carried > 0,
    frozen: (g.flags & GHOST_SECURING) !== 0 || (newest.state.flags & STATE_RESULT) !== 0,
    receivedAt: newest.receivedAt,
  };
}

// Other ghosts a render buffer behind, smoothly; the own one where the own input has already
// taken it (prediction.ts).
function drawnGhosts(now: number, target: number | null, ownId: number | null): GhostState[] {
  const predicted = prediction.update(now, conn.direction, ownServer(ownId));
  const ghosts = target === null ? [] : interpolate(conn.buffer, target).ghosts;
  return ghosts.map((g) => (g.id === ownId && predicted ? { ...g, ...predicted } : g));
}

function snapshot(now: number): { f: Frame; timing: FrameTiming } {
  const target = renderClock.target(now, latestServerMs(conn.buffer));
  const ownId = conn.welcome?.ghost ?? null;
  const ghosts = drawnGhosts(now, target, ownId);
  const latest = conn.buffer.at(-1)?.state;
  const playing = conn.mode === 'player';
  const newestMs = latest?.serverMs ?? null;
  const timing = { frameMs: now, targetMs: target, latestMs: newestMs, coinsMs: newestMs };
  const f: Frame = {
    ghosts,
    latest,
    // The newest state's coins: the own ghost is drawn at the newest moment or ahead of it, so
    // its pickups show when it touches a coin (reports/session-2026-11-16-human.md "Response").
    coins: latest?.coins ?? [],
    ownId,
    own: ghosts.find((g) => g.id === ownId),
    ownTeam: playing ? (conn.welcome?.team ?? null) : null,
    playing,
    over: latest !== undefined && (latest.flags & STATE_RESULT) !== 0,
    hud: hudOnField(),
  };
  return { f, timing };
}

// "You are Team <Season>" in the team colour, for players only (owner's play test 2026-11-15).
// On a narrow phone "You are " is hidden (index.html), so the team's name is never cut off.
function showTeam(team: number | null): void {
  teamLine.hidden = team === null;
  if (team === null || teamLine.dataset.team === String(team)) return;
  const lead = document.createElement('span');
  lead.className = 'lead';
  lead.textContent = 'You are ';
  teamLine.replaceChildren(lead, `Team ${seasonName(team)}`);
  teamLine.style.color = seasonColour(team);
  teamLine.dataset.team = String(team);
}

function draw(f: Frame): Drawn {
  const drawn = drawScene(ctx, f, viewToggle?.mode ?? 'overview', trails);
  showTeam(f.ownTeam);
  viewButton.hidden = !f.playing;
  const offer = f.latest?.offers.find((o) => o.ghost === f.ownId);
  hud.showControls(f.playing && !f.over, offer);
  prices.update(f.latest?.season ?? null);
  result.update(f.latest, f.over && performance.now() >= resultFrom, f.ownId, recap);
  return drawn;
}

function countdownOf(s: ServerState | undefined): { ms: number; toEnd: boolean } | null {
  if (!s || s.countdownMs === null) return null;
  return { ms: s.countdownMs, toEnd: (s.flags & STATE_TO_END) !== 0 };
}

// Read by the Playwright specs: what this client knows and drew, never more than it shows.
function expose(f: Frame, drawn: Drawn, timing: FrameTiming): void {
  (window as unknown as { __client: unknown }).__client = {
    timing,
    mode: conn.mode,
    ghost: f.ownId,
    team: conn.welcome?.team ?? null,
    own: f.own ? { x: f.own.x, y: f.own.y, carried: f.own.carried } : null,
    season: f.latest?.season ?? null,
    coins: f.latest?.coins.length ?? 0,
    halvings,
    // The clock's countdown as the server sent it, and whether it runs to the match end.
    countdown: countdownOf(f.latest),
    result: f.over,
    ...drawn,
  };
}

function frame(): void {
  const now = performance.now();
  conn.flush(now);
  const { f, timing } = snapshot(now);
  expose(f, draw(f), timing);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
