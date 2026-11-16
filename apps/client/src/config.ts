// Seasonal Spirits — the client's configuration: the bridge box, the camera, the team signals.
// The bridge box (CONCEPT.md §1 rule 3, §8) is on by default and switched off here.

export interface ClientConfig {
  bridge: {
    enabled: boolean;
    startHereUrl: string; // the website's path for newcomers
    simulatorUrl: string;
  };
  cameraSpan: number; // field units a player sees along the shorter side of the screen
  signalShowMs: number; // how long a team signal's marker stays on the field and the minimap
}

export const CLIENT_CONFIG: ClientConfig = {
  bridge: {
    enabled: true,
    // The website's "Start here" page (seasonal-entertainment docs/DESIGN.md, "Start here").
    startHereUrl: 'https://stentertainment.net/start',
    simulatorUrl: 'https://seasonaltokens.org',
  },
  cameraSpan: 1100, // placeholder — owner decides
  signalShowMs: 3000, // owner decision 2026-11-16 (team signals)
};

// CONCEPT.md §8, word for word.
export const BRIDGE_TEXT =
  'This is how Seasonal Tokens work: hold the season, swap before it turns, expect less after the halving.';
