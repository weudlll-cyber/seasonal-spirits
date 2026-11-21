// Seasonal Sumo — one address for the game, the viewer and the dev admin panel (chain 2026-11-21,
// piece 1, like Mini Games' single address with /admin): the client's dev server (port 5930) also
// serves the viewer's page (apps/viewer) at /viewer/ and, with its admin panel, at /admin/. The
// viewer runs as a second Vite server in middleware mode inside this one; the match server stays
// on its own port behind both. Development only (Vite's `serve`); a build has neither page.

import { fileURLToPath } from 'node:url';
import { createServer, type Plugin } from 'vite';

const VIEWER_ROOT = fileURLToPath(new URL('../../viewer', import.meta.url));
export const VIEWER_BASE = '/viewer/';
const ADMIN = '/admin';

// The path the viewer's server answers for `url`: /admin and /admin/ show the viewer's page (it
// opens its panel there, apps/viewer main.ts), /viewer the same as /viewer/; null for the game's
// own requests.
export function viewerPath(url: string): string | null {
  const [pathname = '', query = ''] = url.split('?', 2);
  const q = query ? `?${query}` : '';
  if (pathname === ADMIN || pathname === `${ADMIN}/` || pathname === '/viewer') {
    return `${VIEWER_BASE}${q}`;
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
