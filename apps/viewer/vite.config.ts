// Seasonal Spirits — Vite config for the browser viewer, served by the client's dev server at
// /viewer/ and /admin/ (apps/client vite/viewer-pages.ts). The admin panel is in the dev server
// only, never in a build (`__ADMIN_PANEL__`, checked by build-check.mjs).

import { themeInit } from '@seasonal/kit/vite';
import { defineConfig } from 'vite';

const serverPort = Number(process.env.SERVER_PORT ?? 3930);

export default defineConfig(({ command }) => ({
  plugins: [themeInit()],
  define: {
    __SERVER_PORT__: JSON.stringify(serverPort),
    __ADMIN_PANEL__: JSON.stringify(command === 'serve'),
  },
}));
