// Seasonal Sumo — the result screen in the kit's result frame (@seasonal/kit ResultFrame, night
// chain 2026-11-21 piece 4): the headline, the own place and the time to the next match, the
// podium as the reveal, the awards and the teams as the placings, the players and the bridge box
// below. Its parts keep their ids; result.ts fills them as before. Fitted to the screen with a
// 14 px text floor: no `data-sk-game`, so the kit's strictest floors apply; the scale's floor is
// Mini Games' (0.6): the owner set the Seasonal Party floor at 14 px body text (2026-11-21), and
// the kit's FIT_FLOORS has no Seasonal Party entry yet.

import { ResultFrame } from '@seasonal/kit/react';
import type { ReactElement } from 'react';

function Bridge(): ReactElement {
  return (
    <div id="bridge">
      <p id="bridge-text" />
      <div className="buttons">
        <a id="start-here" className="link" target="_blank" rel="noopener noreferrer">
          Start here
        </a>
        <a id="simulator" className="link" target="_blank" rel="noopener noreferrer">
          Try the simulator
        </a>
      </div>
      <p className="small">No financial advice</p>
    </div>
  );
}

// `signature` changes with every result filled, so the frame fits again.
export function ResultCard(p: { readonly signature: string }): ReactElement {
  return (
    <ResultFrame
      game="mini-games"
      fitted
      signature={p.signature}
      headline="Result"
      lines={
        <>
          <p id="result-place" />
          <p id="result-next" className="small" />
        </>
      }
      reveal={<canvas id="podium" width={300} height={190} aria-hidden="true" />}
      placings={
        <>
          <div id="result-awards-box">
            <h3>Awards</h3>
            <ol id="result-awards" />
          </div>
          <h3>Teams</h3>
          <ol id="result-teams" />
        </>
      }
      more={
        <>
          <h3>Players</h3>
          <ol id="result-players" />
          <Bridge />
        </>
      }
    />
  );
}
