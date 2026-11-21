// Seasonal Spirits — Vite config for the browser viewer. It has no port of its own: the client's
// dev server serves it at /viewer/ and /admin/ (apps/client vite/viewer-pages.ts, one address).
// The match server's port goes into the build; the host is the page's own. The kit's early theme
// script (@seasonal/kit/vite themeInit) sets <html data-theme> before the first paint.

import { themeInit } from '@seasonal/kit/vite';
import { defineConfig } from 'vite';

const serverPort = Number(process.env.SERVER_PORT ?? 3930);

export default defineConfig({
  plugins: [themeInit()],
  define: {
    __SERVER_PORT__: JSON.stringify(serverPort),
  },
});
