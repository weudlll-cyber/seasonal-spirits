// Seasonal Sumo — the client's configuration: the bridge box and the camera.
// The bridge box (CONCEPT.md §1 rule 3, §8) is on by default and switched off here.

export interface ClientConfig {
  bridge: {
    enabled: boolean;
    startHereUrl: string; // the website's path for newcomers
    simulatorUrl: string;
  };
  cameraSpan: number; // field units a player sees along the shorter side of the screen
}

export const CLIENT_CONFIG: ClientConfig = {
  bridge: {
    enabled: true,
    // The website's "Start here" page (seasonal-entertainment docs/DESIGN.md, "Start here").
    startHereUrl: 'https://stentertainment.net/start',
    simulatorUrl: 'https://seasonaltokens.org',
  },
  cameraSpan: 1100, // placeholder — owner decides
};

// Word for word from the owner's sketch of Seasonal Sumo (NIGHT 2026-11-17).
export const BRIDGE_TEXT =
  'This is how Seasonal Tokens work: every halving cuts in half — here it cuts the arena.';
