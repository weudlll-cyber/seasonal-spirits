// Seasonal Sumo — whether the client is built with the dev admin link (chain 2026-11-21, piece 1:
// one address, an "Admin" link in the game in development only). The link points to /admin on
// the same address; production shows none, and the server refuses the admin endpoint there anyway
// (apps/server admin-settings.ts).

// True only for Vite's dev server (`serve`, never a build), with the admin panel switched on
// (DEV_TUNING=1, which `pnpm dev` sets) and never with NODE_ENV=production.
export function devAdmin(env: NodeJS.ProcessEnv, command: 'serve' | 'build'): boolean {
  return command === 'serve' && env.DEV_TUNING === '1' && env.NODE_ENV !== 'production';
}
