// Seasonal Spirits — `pnpm dev` / `pnpm dev:stop`: match server and player client (also serving
// /viewer/ and /admin/), bots in all 32 seats, the modes in rotation, DEV_TUNING=1; hidden
// processes, logs in logs/, PIDs in tmp/dev-pids.json. `--lan` (development only) opens the LAN.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The admin panel's last loaded preset (apps/server presets.ts), if any.
const lastPreset = () => fs.existsSync(path.join(ROOT, 'data/presets/last-loaded.txt'));
const PID_FILE = path.join(ROOT, 'tmp', 'dev-pids.json');
const SERVER_PORT = 3930;
const CLIENT_PORT = 5930;

/**
 * @typedef {{ name: string, pid: number }} Started
 * @param {string} name
 * @param {string} cwd repository-relative working directory
 * @param {string[]} args arguments for node
 * @param {Record<string, string>} env added to this process's environment
 * @returns {Started}
 */
function startHidden(name, cwd, args, env) {
  fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });
  const logBase = path.join(ROOT, 'logs', `dev-${name}`);
  const fullEnv = { ...process.env, ...env };
  if (process.platform === 'win32') {
    return startWindows(name, { cwd: path.join(ROOT, cwd), args, env: fullEnv }, logBase);
  }
  const log = fs.openSync(`${logBase}.log`, 'w');
  const child = spawn(process.execPath, args, {
    cwd: path.join(ROOT, cwd),
    detached: true,
    env: fullEnv,
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
// Start-Process passes PowerShell's environment on, which is the env given to spawnSync.
/**
 * @param {string} name @param {string} logBase
 * @param {{ cwd: string, args: string[], env: NodeJS.ProcessEnv }} run
 */
function startWindows(name, run, logBase) {
  const { cwd, args, env } = run;
  const q = (/** @type {string} */ s) => `'${s.replaceAll("'", "''")}'`;
  const pidFile = `${logBase}.pid`;
  const command =
    `(Start-Process -FilePath ${q(process.execPath)} -ArgumentList ${args.map(q).join(',')} ` +
    `-WorkingDirectory ${q(cwd)} -WindowStyle Hidden -PassThru ` +
    `-RedirectStandardOutput ${q(`${logBase}.log`)} -RedirectStandardError ${q(`${logBase}.err.log`)}` +
    `).Id | Set-Content -Path ${q(pidFile)}`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'ignore', env });
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

// The machine's IPv4 address on the local network, for the phone. Home ranges first: a VPN
// (Tailscale's 100.64/10) or a virtual switch (WSL's 172.x) may come first in the list but
// is not reachable from a phone on the same Wi-Fi.
const LAN_ORDER = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

function lanAddress() {
  const all = Object.values(os.networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  for (const range of LAN_ORDER) {
    const found = all.find((a) => range.test(a));
    if (found) return found;
  }
  return all[0] ?? null;
}

/** @param {boolean} lan */
async function start(lan) {
  if (process.env.NODE_ENV === 'production') throw new Error('pnpm dev is development only');
  if (recorded().some((p) => alive(p.pid))) throw new Error('already running; pnpm dev:stop first');
  for (const port of [SERVER_PORT, CLIENT_PORT]) {
    if (await portOpen(port)) throw new Error(`port ${port} is in use by another process`);
  }
  const host = lan ? '0.0.0.0' : '127.0.0.1';
  /** @type {Started[]} */
  const started = [];
  const launch = async (
    /** @type {[string, string, string[], Record<string, string>, number]} */ p,
  ) => {
    started.push(startHidden(p[0], p[1], p[2], p[3]));
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, JSON.stringify(started));
    await waitForPort(p[4], 15_000);
  };
  const vite = ['node_modules/vite/bin/vite.js'];
  await launch([
    'server',
    'apps/server',
    ['--import', 'tsx', 'src/main.ts'],
    // Every mode in turn, unless a preset was loaded last (the server starts with it) or the
    // caller names GAME_MODE (passed on as it is). DEV_TUNING: the admin panel at /admin/ on the
    // client's address, the one page allowed to call (docs/SERVER.md, "Settings and presets").
    {
      HOST: host,
      ...(lastPreset() ? {} : { GAME_MODE: process.env.GAME_MODE ?? 'rotate' }),
      DEV_TUNING: '1',
      CLIENT_PORT: String(CLIENT_PORT),
    },
    SERVER_PORT,
  ]);
  await launch([
    'client',
    'apps/client',
    vite,
    { CLIENT_HOST: host, DEV_TUNING: '1' },
    CLIENT_PORT,
  ]);
  console.log(`Seasonal Spirits dev: ${started.map((p) => `${p.name} ${p.pid}`).join(', ')}`);
  console.log(`Client: http://localhost:${CLIENT_PORT}`);
  const address = lan ? lanAddress() : null;
  if (lan)
    console.log(
      `Phone (same Wi-Fi): ${address ? `http://${address}:${CLIENT_PORT}` : 'no LAN address found'}`,
    );
  console.log(
    `Viewer: http://localhost:${CLIENT_PORT}/viewer/   Admin (settings and presets, this PC${lan ? ' and the home network' : ' only'}): ` +
      `http://localhost:${CLIENT_PORT}/admin/   (logs in logs/, stop with pnpm dev:stop)`,
  );
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
  start(process.argv.includes('--lan')).catch((/** @type {unknown} */ err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
