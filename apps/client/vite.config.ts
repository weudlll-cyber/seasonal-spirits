// Seasonal Spirits — Vite config for the player client.
// Loopback only by default; CLIENT_HOST=0.0.0.0 (set by `pnpm dev --lan`, development only)
// lets a phone in the same Wi-Fi open it. The match server's port goes into the build; the
// host is the page's own, so a phone reaches the same machine. The dev server also serves the
// viewer and the admin panel at /viewer/ and /admin/ (vite/viewer-pages.ts: one address), and with
// DEV_TUNING=1 the game shows an "Admin" link (vite/dev-admin.ts). The kit's early theme script
// (@seasonal/kit/vite themeInit) sets <html data-theme> before the first paint.

import { themeInit } from '@seasonal/kit/vite';
import { defineConfig } from 'vite';
import { devAdmin } from './vite/dev-admin.js';
import { viewerPages } from './vite/viewer-pages.js';

if (process.env.NODE_ENV === 'production' && process.env.CLIENT_HOST === '0.0.0.0') {
  throw new Error('the LAN mode is development only');
}

const port = Number(process.env.CLIENT_PORT ?? 5930);
const serverPort = Number(process.env.SERVER_PORT ?? 3930);

export default defineConfig(({ command }) => ({
  server: {
    port,
    strictPort: true,
    host: process.env.CLIENT_HOST === '0.0.0.0' ? '0.0.0.0' : 'localhost',
  },
  plugins: [themeInit(), viewerPages()],
  define: {
    __SERVER_PORT__: JSON.stringify(serverPort),
    __DEV_ADMIN__: JSON.stringify(devAdmin(process.env, command)),
  },
}));
