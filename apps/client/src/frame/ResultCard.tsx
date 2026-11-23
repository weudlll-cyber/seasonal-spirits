// Seasonal Sumo — the result screen in the kit's ResultFrame: headline, own place, podium, awards,
// teams, players and bridge box; result.ts fills the parts by id. Fitted with a 14 px text floor
// (no `data-sk-game`, scale floor 0.6); at the floor only the players' list scrolls (result.css).

import { ResultFrame } from '@seasonal/kit/react';
import type { ReactElement } from 'react';
import './result.css';

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
        <div className="result-rest" data-sk-fit-fixed="">
          <h3 id="result-players-head">Players</h3>
          <div
            id="result-players-area"
            role="region"
            aria-labelledby="result-players-head"
            tabIndex={0}
          >
            <ol id="result-players" />
          </div>
          <Bridge />
        </div>
      }
    />
  );
}
