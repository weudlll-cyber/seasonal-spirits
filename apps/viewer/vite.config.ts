// Seasonal Spirits — Vite config for the browser viewer.

import { defineConfig } from 'vite';

const port = Number(process.env.VIEWER_PORT ?? 5930);
const serverPort = Number(process.env.PORT ?? 3930);

export default defineConfig({
  server: {
    port,
    strictPort: true,
  },
  define: {
    __SERVER_WS_URL__: JSON.stringify(`ws://localhost:${serverPort}`),
    __SERVER_HTTP_URL__: JSON.stringify(`http://localhost:${serverPort}`),
  },
});
