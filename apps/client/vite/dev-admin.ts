// Seasonal Sumo — whether the client is built with the dev "Admin" link to /admin on the same
// address; production has none, and the server refuses its admin endpoint there anyway.

// True only for Vite's dev server (`serve`, never a build), with the admin panel switched on
// (DEV_TUNING=1, which `pnpm dev` sets) and never with NODE_ENV=production.
export function devAdmin(env: NodeJS.ProcessEnv, command: 'serve' | 'build'): boolean {
  return command === 'serve' && env.DEV_TUNING === '1' && env.NODE_ENV !== 'production';
}
