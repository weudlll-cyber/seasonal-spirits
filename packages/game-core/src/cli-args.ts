// Seasonal Sumo — the command-line arguments of `pnpm simulate`, checked in one place: a whole
// number in a range, a game mode.

import { GAME_MODES, type GameMode } from './config.js';

// `--name <n>`: a whole number from 0 to `max`, or `fallback` when absent; anything else ends
// the command with exit code 2.
export function numberArg(
  argv: readonly string[],
  name: string,
  fallback: number,
  max: number,
): number {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const raw = argv[i + 1] ?? '';
  if (!/^\d{1,9}$/.test(raw) || Number(raw) > max) {
    console.error(`${name} needs a whole number from 0 to ${max}, got "${raw}"`);
    process.exit(2);
  }
  return Number(raw);
}

// `--mode <mode>`: one of the game modes, sumo when absent; anything else exits with code 2.
export function modeArg(argv: readonly string[]): GameMode {
  const i = argv.indexOf('--mode');
  if (i === -1) return 'sumo';
  const raw = argv[i + 1] ?? '';
  const mode = GAME_MODES.find((m) => m === raw);
  if (!mode) {
    console.error(`--mode needs one of ${GAME_MODES.join(', ')}, got "${raw}"`);
    process.exit(2);
  }
  return mode;
}
