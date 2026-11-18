// Seasonal Sumo — the player client: joins the match, steers one ghost, shows the match.
// Development mode, no sign-in: the server gives a free slot (a bot leaves) or, when every
// slot has a player, lets the client watch. With ?spectate=1 it only watches (CONCEPT.md §5):
// the whole field, every name, the clock and the halving staging, no controls. Draws with
// packages/render (scene.ts), interpolates with packages/protocol; everything shown comes
// from the server's state, only the own ghost is drawn ahead of it by the own input
// (prediction.ts, display only).

import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import {
  GHOST_FALLING,
  GHOST_OUT,
  GHOST_AIRBORNE,
  GHOST_PROTECTED,
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
import {
  BreakOff,
  Seasons,
  Trails,
  bindLookSwitch,
  clientConfig,
  matchName,
  modeOf,
  seasonColour,
  seasonName,
  useShape,
} from '@seasonal-spirits/render';
import { Connection, type Mode } from './connection.js';
import { Help, variantRule } from './help.js';
import { Hud, MATCH_OVER_MS, bindMute, el, hudOnField } from './hud.js';
import { bindJoystick, bindKeyboard, type Controls } from './input.js';
import { Hearts, OUT_LINE, heartsOf, ownOut } from './lives.js';
import { OwnMarker, fellLine } from './own-marker.js';
import { OwnPrediction, type ServerOwn } from './prediction.js';
import { ResultScreen } from './result.js';
import { NO_MARKS, drawScene, type Drawn, type Frame } from './scene.js';
import { ScoreBoard } from './scores.js';
import { DeadlineTone } from './sound.js';

// Render this far behind the newest state: one server tick, so other ghosts are drawn about a
// ghost radius from where they are (FIX 2026-11-17-2: at 100 ms they lagged 2.7 radii at a
// dash hit) and are extrapolated briefly when a state is late (docs/CLIENT.md).
const BUFFER_MS = 50;

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

bindLookSwitch(el('look', HTMLButtonElement));
const tone = new DeadlineTone();
bindMute(() => tone.toggleMute(), tone.muted);
const teamLine = el('team');
const memory = { trails: new Trails(), breaks: new BreakOff(), seasons: new Seasons() };
const renderClock = new RenderClock({ bufferMs: BUFFER_MS }); // every ghost but the own one
const prediction = new OwnPrediction();
const result = new ResultScreen();
const scores = new ScoreBoard();
const hearts = new Hearts();
let dashPressed = false; // since the last frame: the own prediction dashes too
let jumpPressed = false; // … and jumps
let halvings = 0;
let resultFrom = 0; // performance.now() from which the result screen may show
let recap: ServerRecap | null = null; // of the match just ended, during the result pause

const NOTICES: Record<Mode, string | null> = {
  connecting: 'Connecting…',
  player: null,
  spectator: spectate ? 'Watching the match.' : null,
  closed: 'The connection to the match server is gone. Reload the page to join again.',
};

const marker = new OwnMarker();

const conn = new Connection(spectate ? 'spectator' : 'player', {
  onState: (s: ServerState) => {
    marker.observe(s, conn.welcome?.ghost ?? null, performance.now(), clientConfig(s.mode).outMs);
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
    if (a === 'dash') dashPressed = true;
    else jumpPressed = true;
    conn.act(a);
  },
};
bindKeyboard(controls);
bindJoystick(el('stick'), el('knob'), controls);
const help = new Help(el('help'), el('help-open', HTMLButtonElement));

// The own ghost in the newest state, as the prediction needs it; null while watching.
function ownServer(ownId: number | null): ServerOwn | null {
  const newest = conn.buffer.at(-1);
  const g = newest?.state.ghosts.find((x) => x.id === ownId);
  if (conn.mode !== 'player' || !newest || !g) return null;
  const away = (g.flags & (GHOST_FALLING | GHOST_OUT)) !== 0;
  return {
    x: g.x,
    y: g.y,
    vx: g.vx,
    vy: g.vy,
    dashLeftMs: g.dashLeftMs,
    jumpLeftMs: g.jumpLeftMs,
    airborne: (g.flags & GHOST_AIRBORNE) !== 0,
    frozen: away || (newest.state.flags & STATE_RESULT) !== 0,
    receivedAt: newest.receivedAt,
  };
}

// Off the arena, protected after a respawn or in the air: the server lets it touch nobody.
const AWAY = GHOST_FALLING | GHOST_OUT | GHOST_PROTECTED | GHOST_AIRBORNE;

// Other ghosts a render buffer behind, smoothly; the own one where the own input has already
// taken it (prediction.ts), stopped at the drawn ghosts the server would let it touch.
function drawnGhosts(now: number, target: number | null, ownId: number | null): GhostState[] {
  // The running match's rules (the server's tuning, or the defaults): for the prediction and the
  // drawing alike.
  const mode = conn.buffer.at(-1)?.state.mode;
  if (mode !== undefined) {
    const cfg = clientConfig(mode, conn.tuning);
    prediction.useConfig(cfg);
    useShape(cfg);
  }
  const ghosts = target === null ? [] : interpolate(conn.buffer, target).ghosts;
  const own = ghosts.find((g) => g.id === ownId);
  const others =
    own && !(own.flags & AWAY) ? ghosts.filter((g) => g !== own && !(g.flags & AWAY)) : [];
  const predicted = prediction.update(now, conn.direction, ownServer(ownId), {
    dash: dashPressed,
    jump: jumpPressed,
    others,
  });
  dashPressed = false;
  jumpPressed = false;
  const air = prediction.airborne() ? GHOST_AIRBORNE : 0;
  return ghosts.map((g) =>
    g.id === ownId && predicted ? { ...g, ...predicted, flags: g.flags | air } : g,
  );
}

function snapshot(now: number): Frame {
  const target = renderClock.target(now, latestServerMs(conn.buffer));
  const ownId = conn.welcome?.ghost ?? null;
  const ghosts = drawnGhosts(now, target, ownId);
  const latest = conn.buffer.at(-1)?.state;
  const playing = conn.mode === 'player';
  return {
    ghosts,
    latest,
    ownId,
    own: ghosts.find((g) => g.id === ownId),
    ownTeam: playing ? (conn.welcome?.team ?? null) : null,
    playing,
    over: latest !== undefined && (latest.flags & STATE_RESULT) !== 0,
    hud: hudOnField(),
    marks: playing ? { pulseMs: marker.pulseMs(now), backInMs: marker.backInMs() } : NO_MARKS,
  };
}

// "You are Team <Season>" behind the team's colour dot, for players only (owner's play test 2026-11-15).
// On a narrow phone "You are " is hidden (index.html), so the team's name is never cut off.
// While the own ghost is out after a fall the line says when it is back (FIX 2026-11-17-3);
// out of lives, that it watches until the next match (LIVES 2026-11-17).
function showTeam(team: number | null, backInMs: number | null, out: boolean): void {
  teamLine.hidden = team === null;
  if (team !== null && (out || backInMs !== null)) {
    teamLine.textContent = out ? OUT_LINE : fellLine(backInMs ?? 0);
    teamLine.style.setProperty('--team', seasonColour(team));
    delete teamLine.dataset.team;
    return;
  }
  if (team === null || teamLine.dataset.team === String(team)) return;
  const lead = document.createElement('span');
  lead.className = 'lead';
  lead.textContent = 'You are ';
  teamLine.replaceChildren(lead, `Team ${seasonName(team)}`);
  teamLine.style.setProperty('--team', seasonColour(team));
  teamLine.dataset.team = String(team);
}

// The own lives as the band shows them (hearts) and whether it is out until the next match;
// nothing while watching.
function livesOf(f: Frame): { hearts: boolean[] | null; out: boolean } {
  const ownId = f.playing ? f.ownId : null;
  return { hearts: heartsOf(f.latest, ownId), out: ownOut(f.latest, ownId) };
}

function draw(f: Frame): Drawn {
  if (f.latest) help.show(modeOf(f.latest.mode), matchName(f.latest), variantRule(f.latest));
  const drawn = drawScene(ctx, f, memory);
  const lives = livesOf(f);
  showTeam(f.ownTeam, f.marks.backInMs, lives.out);
  hearts.update(lives.hearts);
  const own = f.latest?.ghosts.find((g) => g.id === f.ownId);
  // Out of lives: nothing to steer until the next match, so no buttons. Jump only while the
  // owner's switch has it on (the tuning the server sent; on without one).
  const cfg = clientConfig(f.latest?.mode ?? 0, conn.tuning);
  const dash = { shown: true, leftMs: own?.dashLeftMs ?? 0, cooldownMs: cfg.dashCooldownMs };
  hud.showControls(f.playing && !f.over && !lives.out, dash, {
    shown: cfg.jump.enabled,
    leftMs: own?.jumpLeftMs ?? 0,
    cooldownMs: cfg.jump.cooldownMs,
  });
  scores.update(f.latest);
  result.update(f.latest, f.over && performance.now() >= resultFrom, f.ownId, recap);
  return drawn;
}

function countdownOf(s: ServerState | undefined): { ms: number; toEnd: boolean } | null {
  if (!s || s.countdownMs === null) return null;
  return { ms: s.countdownMs, toEnd: (s.flags & STATE_TO_END) !== 0 };
}

// Read by the Playwright specs: what this client knows and drew, never more than it shows.
function expose(f: Frame, drawn: Drawn): void {
  const s = f.latest;
  (window as unknown as { __client: unknown }).__client = {
    mode: conn.mode,
    ghost: f.ownId,
    team: conn.welcome?.team ?? null,
    own: f.own
      ? { x: f.own.x, y: f.own.y, flags: f.own.flags, dashLeftMs: f.own.dashLeftMs }
      : null,
    season: s?.season ?? null,
    gameMode: s ? modeOf(s.mode) : null,
    area: s?.area ?? null,
    next: s?.next ?? null,
    teamScore: s ? [...s.teamScore] : null,
    ...livesOf(f),
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
  const f = snapshot(now);
  expose(f, draw(f));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
