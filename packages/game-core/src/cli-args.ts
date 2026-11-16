// Seasonal Sumo — the command-line arguments of `pnpm simulate`, checked in one place: a whole
// number in a range.

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
