// Seasonal Sumo — one address for game, viewer and dev admin panel: the client's dev server (5930)
// also serves apps/viewer at /viewer/ and /admin/ as a middleware-mode Vite server inside it.
// Development only (Vite's `serve`); a build has neither page.

import { fileURLToPath } from 'node:url';
import { createServer, type Plugin } from 'vite';

const VIEWER_ROOT = fileURLToPath(new URL('../../viewer', import.meta.url));
export const VIEWER_BASE = '/viewer/';
const ADMIN = '/admin';

// The path the viewer's server answers for `url`: /admin and /admin/ show the viewer's page (it
// opens its panel there, apps/viewer main.ts), and a file under /admin/ is the viewer's file (the
// page's relative src, the kit's theme-init.js); /viewer the same as /viewer/; null for the
// game's own requests.
export function viewerPath(url: string): string | null {
  const [pathname = '', query = ''] = url.split('?', 2);
  const q = query ? `?${query}` : '';
  if (pathname === ADMIN || pathname === '/viewer') return `${VIEWER_BASE}${q}`;
  if (pathname.startsWith(`${ADMIN}/`)) {
    return `${VIEWER_BASE}${pathname.slice(ADMIN.length + 1)}${q}`;
  }
  return pathname.startsWith(VIEWER_BASE) ? url : null;
}

export function viewerPages(): Plugin {
  return {
    name: 'seasonal-viewer-pages',
    apply: 'serve',
    async configureServer(server) {
      // The viewer's own config (its defines), at its base; its live reload on this server's port
      // (the socket's path is under its base, so the game's own socket is not touched).
      const pages = await createServer({
        root: VIEWER_ROOT,
        configFile: fileURLToPath(new URL('../../viewer/vite.config.ts', import.meta.url)),
        base: VIEWER_BASE,
        server: {
          middlewareMode: true,
          hmr: server.httpServer ? { server: server.httpServer } : false,
        },
      });
      server.middlewares.use((req, res, next) => {
        const to = viewerPath(req.url ?? '/');
        if (to === null) {
          next();
          return;
        }
        req.url = to;
        pages.middlewares(req, res, next);
      });
      server.httpServer?.once('close', () => {
        void pages.close();
      });
    },
  };
}
