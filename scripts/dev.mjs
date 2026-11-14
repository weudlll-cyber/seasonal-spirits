// Seasonal Spirits — `pnpm dev` / `pnpm dev:stop`: match server and viewer, detached.
// The server's own bots fill all 32 slots. Starts both as hidden background processes (no
// windows on Windows, the same on Linux and macOS), logs to logs/dev-*.log (and
// dev-*.err.log on Windows), records their PIDs in tmp/dev-pids.json, and stops exactly
// those PIDs again.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PID_FILE = path.join(ROOT, 'tmp', 'dev-pids.json');
const SERVER_PORT = 3930;
const VIEWER_PORT = 5930;

/**
 * @typedef {{ name: string, pid: number }} Started
 * @param {string} name
 * @param {string} cwd repository-relative working directory
 * @param {string[]} args arguments for node
 * @returns {Started}
 */
function startHidden(name, cwd, args) {
  fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
  const logBase = path.join(ROOT, 'logs', `dev-${name}`);
  if (process.platform === 'win32') return startWindows(name, path.join(ROOT, cwd), args, logBase);
  const log = fs.openSync(`${logBase}.log`, 'w');
  const child = spawn(process.execPath, args, {
    cwd: path.join(ROOT, cwd),
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();
  if (child.pid === undefined) throw new Error(`could not start ${name}`);
  return { name, pid: child.pid };
}

// On Windows a shell (an IDE terminal, an agent's tool) may run commands in a job object that
// ends every child process with it; Start-Process starts the process outside that job. The
// PID comes back through a file: the started process inherits handles, so a stdout pipe to
// PowerShell would stay open as long as it runs.
/** @param {string} name @param {string} cwd @param {string[]} args @param {string} logBase */
function startWindows(name, cwd, args, logBase) {
  const q = (/** @type {string} */ s) => `'${s.replaceAll("'", "''")}'`;
  const pidFile = `${logBase}.pid`;
  const command =
    `(Start-Process -FilePath ${q(process.execPath)} -ArgumentList ${args.map(q).join(',')} ` +
    `-WorkingDirectory ${q(cwd)} -WindowStyle Hidden -PassThru ` +
    `-RedirectStandardOutput ${q(`${logBase}.log`)} -RedirectStandardError ${q(`${logBase}.err.log`)}` +
    `).Id | Set-Content -Path ${q(pidFile)}`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'ignore' });
  const pid = fs.existsSync(pidFile) ? Number(fs.readFileSync(pidFile, 'utf8').trim()) : NaN;
  fs.rmSync(pidFile, { force: true });
  if (r.status !== 0 || !Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error(`could not start ${name}; see logs/dev-${name}.err.log`);
  }
  return { name, pid };
}

// "localhost" tries every address it resolves to: Vite listens on ::1 only, the server on
// all addresses.
/** @param {number} port @returns {Promise<boolean>} */
function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost', autoSelectFamily: true });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

/** @param {number} port @param {number} timeoutMs */
async function waitForPort(port, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await portOpen(port)) return;
    await delay(200);
  }
  throw new Error(`nothing listens on port ${port} after ${timeoutMs} ms; see logs/`);
}

/** @param {number} pid */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Only well-formed entries: a damaged file must not make dev:stop signal a random PID.
/** @returns {Started[]} */
function recorded() {
  if (!fs.existsSync(PID_FILE)) return [];
  /** @type {unknown} */
  const value = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  /** @type {unknown[]} */
  const items = Array.isArray(value) ? value : [];
  return items.filter(isStarted);
}

/** @param {unknown} p @returns {p is Started} */
function isStarted(p) {
  if (typeof p !== 'object' || p === null) return false;
  const { name, pid } = /** @type {{ name?: unknown, pid?: unknown }} */ (p);
  return typeof name === 'string' && Number.isSafeInteger(pid) && Number(pid) > 0;
}

async function start() {
  if (process.env.NODE_ENV === 'production') throw new Error('pnpm dev is development only');
  if (recorded().some((p) => alive(p.pid))) throw new Error('already running; pnpm dev:stop first');
  for (const port of [SERVER_PORT, VIEWER_PORT]) {
    if (await portOpen(port)) throw new Error(`port ${port} is in use by another process`);
  }
  const started = [startHidden('server', 'apps/server', ['--import', 'tsx', 'src/main.ts'])];
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify(started));
  await waitForPort(SERVER_PORT, 15_000);
  started.push(startHidden('viewer', 'apps/viewer', ['node_modules/vite/bin/vite.js']));
  fs.writeFileSync(PID_FILE, JSON.stringify(started));
  await waitForPort(VIEWER_PORT, 15_000);
  console.log(`Seasonal Spirits dev: ${started.map((p) => `${p.name} ${p.pid}`).join(', ')}`);
  console.log(`Viewer: http://localhost:${VIEWER_PORT}   (logs in logs/, stop with pnpm dev:stop)`);
}

function stop() {
  const list = recorded();
  if (list.length === 0) console.log('Seasonal Spirits dev: nothing recorded to stop');
  for (const p of list) {
    if (!alive(p.pid)) {
      console.log(`${p.name} (${p.pid}) was not running`);
      continue;
    }
    process.kill(p.pid);
    console.log(`${p.name} (${p.pid}) stopped`);
  }
  fs.rmSync(PID_FILE, { force: true });
}

if (process.argv[2] === 'stop') {
  stop();
} else {
  start().catch((/** @type {unknown} */ err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
