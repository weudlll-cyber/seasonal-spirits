// Seasonal Spirits — server package public surface.
// Exported so the probe tool can embed the server in-process and share the env helpers.

export { GameServer, type ServerConfig } from './server.js';
export type { ServerMetrics } from './tick-metrics.js';
export { MatchHost, type WireState } from './match-host.js';
export { envInt, refuseProduction, type Env } from './env.js';
export { teamSizeFromEnv } from './start-settings.js';
