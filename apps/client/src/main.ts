// Seasonal Spirits — the player client: joins the match, steers one ghost, shows the match.
// Development mode, no sign-in: the server gives a free slot (a bot leaves) or, when every
// slot has a player, lets the client watch. Draws with packages/render, interpolates with
// packages/protocol; everything shown comes from the server's state.

import {
  RenderClock,
  STATE_HALVING_EVENT,
  STATE_RESULT,
  interpolate,
  latestServerMs,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import {
  CLOCK_HEIGHT,
  Trails,
  drawClock,
  drawField,
  drawGhosts,
  fitField,
  follow,
} from '@seasonal-spirits/render';
import { CLIENT_CONFIG } from './config.js';
import { Connection, type Mode } from './connection.js';
import { Hud, bindMute, el } from './hud.js';
import { bindJoystick, bindKeyboard, type Controls } from './input.js';
import { ResultScreen } from './result.js';
import { HalvingTone } from './sound.js';

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

const tone = new HalvingTone();
bindMute(() => tone.toggleMute(), tone.muted);
const trails = new Trails();
const renderClock = new RenderClock({ bufferMs: BUFFER_MS });
const result = new ResultScreen();
let halvings = 0;

const NOTICES: Record<Mode, string | null> = {
  connecting: 'Connecting…',
  player: null,
  spectator: null,
  closed: 'The connection to the match server is gone. Reload the page to join again.',
};

const conn = new Connection('player', {
  onState: (s: ServerState) => {
    // The event is in one state only; every state passes here, so none is missed.
    if (!(s.flags & STATE_HALVING_EVENT)) return;
    halvings++;
    hud.halving(s);
    tone.play();
  },
  onMode: (mode, reason) => {
    hud.say(
      reason === 'full'
        ? 'Every place in this match has a player — you are watching instead.'
        : NOTICES[mode],
    );
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

interface Frame {
  ghosts: GhostState[];
  latest: ServerState | undefined;
  ownId: number | null;
  own: GhostState | undefined;
  playing: boolean;
  over: boolean;
}

function snapshot(now: number): Frame {
  const target = renderClock.target(now, latestServerMs(conn.buffer));
  const ghosts = target === null ? [] : interpolate(conn.buffer, target).ghosts;
  const latest = conn.buffer.at(-1)?.state;
  const ownId = conn.welcome?.ghost ?? null;
  return {
    ghosts,
    latest,
    ownId,
    own: ghosts.find((g) => g.id === ownId),
    playing: conn.mode === 'player',
    over: latest !== undefined && (latest.flags & STATE_RESULT) !== 0,
  };
}

// A player's camera follows its ghost; a spectator sees the whole field.
function draw(f: Frame): void {
  const view =
    f.playing && f.own
      ? follow(ctx, CLOCK_HEIGHT, f.own, CLIENT_CONFIG.cameraSpan)
      : fitField(ctx, CLOCK_HEIGHT);
  const season = f.latest?.season ?? 0;
  trails.record(f.ghosts);
  drawField(view, f.latest);
  drawGhosts(view, f.ghosts, { ownId: f.ownId, season, trails, labelAll: !f.playing });
  drawClock(ctx, f.latest);
  const offer = f.latest?.offers.find((o) => o.ghost === f.ownId);
  hud.showControls(f.playing && !f.over, offer, season);
  result.update(f.latest, f.over, f.ownId);
}

// Read by the Playwright specs: what this client knows, never more than it shows.
function expose(f: Frame): void {
  (window as unknown as { __client: unknown }).__client = {
    mode: conn.mode,
    ghost: f.ownId,
    team: conn.welcome?.team ?? null,
    own: f.own ? { x: f.own.x, y: f.own.y, carried: f.own.carried } : null,
    season: f.latest?.season ?? null,
    coins: f.latest?.coins.length ?? 0,
    halvings,
    result: f.over,
  };
}

function frame(): void {
  const now = performance.now();
  conn.flush(now);
  const f = snapshot(now);
  draw(f);
  expose(f);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
