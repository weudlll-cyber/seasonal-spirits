// Seasonal Spirits — Vite config for the player client. Loopback only by default; CLIENT_HOST
// (`pnpm dev --lan`, development only) opens it to the LAN. Also serves /viewer/ and /admin/
// (vite/viewer-pages.ts), the dev "Admin" link (DEV_TUNING=1, vite/dev-admin.ts), WEBSITE_MODE=1
// (exactly "1") for the website frame, and Fredoka's licence in a build (vite/notices.ts).

import { themeInit } from '@seasonal/kit/vite';
import { defineConfig } from 'vite';
import { devAdmin } from './vite/dev-admin.js';
import { thirdPartyNotices } from './vite/notices.js';
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
  plugins: [themeInit(), viewerPages(), thirdPartyNotices()],
  define: {
    __SERVER_PORT__: JSON.stringify(serverPort),
    __DEV_ADMIN__: JSON.stringify(devAdmin(process.env, command)),
    __WEBSITE_MODE__: JSON.stringify(process.env.WEBSITE_MODE === '1'),
  },
}));
