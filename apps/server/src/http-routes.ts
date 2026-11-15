// Seasonal Spirits — the game server's HTTP routes: /metrics-lite, everything else 404.
// /metrics-lite answers loopback callers only (the probe and the local viewer); the CORS
// header for the viewer's own dev port is sent only in development.

import type http from 'node:http';

export function isLoopback(address: string | undefined): boolean {
  if (address === undefined) return false;
  return address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.');
}

export function handleHttp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  metrics: () => unknown,
  devCors: boolean,
): void {
  if (
    req.url !== '/metrics-lite' ||
    req.method !== 'GET' ||
    !isLoopback(req.socket.remoteAddress)
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  const headers: http.OutgoingHttpHeaders = { 'content-type': 'application/json' };
  // The viewer runs on its own Vite dev port. In production the website's nginx is the
  // front door, same origin, and no CORS header is needed.
  if (devCors) headers['access-control-allow-origin'] = '*';
  res.writeHead(200, headers);
  res.end(JSON.stringify(metrics()));
}
