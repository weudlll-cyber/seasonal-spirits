// Seasonal Spirits — server package public surface.
// Exported so the probe tool can embed the server in-process.

export { GameServer, type ServerConfig, type ServerMetrics } from './server.js';
export { World } from './world.js';
