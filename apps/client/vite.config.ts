// Seasonal Spirits — Vite config for the player client.
// Loopback only by default; CLIENT_HOST=0.0.0.0 (set by `pnpm dev --lan`, development only)
// lets a phone in the same Wi-Fi open it. The match server's port goes into the build; the
// host is the page's own, so a phone reaches the same machine.

import { defineConfig } from 'vite';

if (process.env.NODE_ENV === 'production' && process.env.CLIENT_HOST === '0.0.0.0') {
  throw new Error('the LAN mode is development only');
}

const port = Number(process.env.CLIENT_PORT ?? 5930);
const serverPort = Number(process.env.SERVER_PORT ?? 3930);

export default defineConfig({
  server: {
    port,
    strictPort: true,
    host: process.env.CLIENT_HOST === '0.0.0.0' ? '0.0.0.0' : 'localhost',
  },
  define: {
    __SERVER_PORT__: JSON.stringify(serverPort),
  },
});
