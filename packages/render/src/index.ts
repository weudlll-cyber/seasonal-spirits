// Seasonal Sumo — render package public surface: one Canvas 2D drawing for the player client
// and the debug viewer, so nothing is drawn twice.

export * from './palette.js';
export * from './view.js';
export { drawField, playBox } from './field.js';
export { bodyBox, placeLabels, type LabelCandidate, type PlacedLabel } from './labels.js';
export { drawGhosts, ghostRadiusPx, type GhostStyle } from './ghosts.js';
export { Trails } from './trails.js';
export { PULSE_MS, drawRespawnBand } from './own.js';
export { LEGEND, type LegendMarker } from './legend.js';
export { CLOCK_HEIGHT, drawClock, mmss } from './clock.js';
export {
  clientConfig,
  fuseLeft,
  matchName,
  modeOf,
  modeWords,
  variantName,
  type ModeWords,
} from './modes.js';
export { drawBomb } from './bomb.js';
