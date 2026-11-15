// Seasonal Spirits — the player client: joins the match, steers one ghost, shows the match.
// Development mode, no sign-in: the server gives a free slot (a bot leaves) or, when every
// slot has a player, lets the client watch. With ?spectate=1 it only watches (CONCEPT.md §5):
// the whole field, every name, the clock and the halving staging, no controls. Draws with
// packages/render (scene.ts), interpolates with packages/protocol; everything shown comes
// from the server's state.

import {
  RenderClock,
  STATE_HALVING_EVENT,
  STATE_RESULT,
  interpolate,
  latestServerMs,
  stateAt,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { Trails, seasonColour, seasonName } from '@seasonal-spirits/render';
import { Connection, type Mode } from './connection.js';
import { Hud, bindMute, el, hudOnField } from './hud.js';
import { bindJoystick, bindKeyboard, type Controls } from './input.js';
import { ResultScreen } from './result.js';
import { drawScene, type Drawn, type Frame } from './scene.js';
import { HalvingTone } from './sound.js';
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

const tone = new HalvingTone();
bindMute(() => tone.toggleMute(), tone.muted);
const viewButton = el('view', HTMLButtonElement);
// A spectator by URL has no view choice (and its keys do nothing).
const viewToggle = spectate ? null : new ViewToggle(viewButton);
const teamLine = el('team');
const trails = new Trails();
const renderClock = new RenderClock({ bufferMs: BUFFER_MS });
const result = new ResultScreen();
let halvings = 0;

const NOTICES: Record<Mode, string | null> = {
  connecting: 'Connecting…',
  player: null,
  spectator: spectate ? 'Watching the match.' : null,
  closed: 'The connection to the match server is gone. Reload the page to join again.',
};

const conn = new Connection(spectate ? 'spectator' : 'player', {
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

function snapshot(now: number): Frame {
  const target = renderClock.target(now, latestServerMs(conn.buffer));
  const ghosts = target === null ? [] : interpolate(conn.buffer, target).ghosts;
  const latest = conn.buffer.at(-1)?.state;
  const ownId = conn.welcome?.ghost ?? null;
  const playing = conn.mode === 'player';
  return {
    ghosts,
    latest,
    // The coins of the moment the ghosts are drawn at, so a pickup shows when the drawn ghost
    // touches the coin, not a render buffer earlier.
    coins: (target === null ? latest : stateAt(conn.buffer, target))?.coins ?? [],
    ownId,
    own: ghosts.find((g) => g.id === ownId),
    ownTeam: playing ? (conn.welcome?.team ?? null) : null,
    playing,
    over: latest !== undefined && (latest.flags & STATE_RESULT) !== 0,
    hud: hudOnField(),
  };
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
  hud.showControls(f.playing && !f.over, offer, f.latest?.season ?? 0);
  result.update(f.latest, f.over, f.ownId);
  return drawn;
}

// Read by the Playwright specs: what this client knows and drew, never more than it shows.
function expose(f: Frame, drawn: Drawn): void {
  (window as unknown as { __client: unknown }).__client = {
    mode: conn.mode,
    ghost: f.ownId,
    team: conn.welcome?.team ?? null,
    own: f.own ? { x: f.own.x, y: f.own.y, carried: f.own.carried } : null,
    season: f.latest?.season ?? null,
    coins: f.latest?.coins.length ?? 0,
    halvings,
    result: f.over,
    ...drawn,
  };
}

function frame(): void {
  const now = performance.now();
  conn.flush(now);
  const f = snapshot(now);
  expose(f, draw(f));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
