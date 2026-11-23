// Seasonal Sumo — the band's top row as the kit's GameBar: the back link (website mode), the team
// line and lives, and the corner (theme, "?", sound, the dev build's admin link). Rendered once.

import { BackLink, GameBar, ThemeToggle, usePanels } from '@seasonal/kit/react';
import { memo, type ReactElement } from 'react';

function Corner(p: { readonly devAdmin: boolean }): ReactElement {
  return (
    <span id="corner">
      <ThemeToggle />
      <button id="help-open" type="button" className="sk-bar-button" aria-label="How to play">
        ?
      </button>
      <button id="mute" type="button" className="sk-bar-button" aria-pressed="false">
        Sound on
      </button>
      {p.devAdmin ? (
        <a id="admin" href="/admin/" target="_blank" rel="noopener">
          Admin
        </a>
      ) : null}
    </span>
  );
}

export const Bar = memo(function Bar(p: {
  readonly websiteMode: boolean;
  readonly devAdmin: boolean;
}): ReactElement {
  const panels = usePanels();
  return (
    <GameBar
      lead={
        <>
          <BackLink websiteMode={p.websiteMode} />
          <div id="team" className="dot" hidden />
          <div id="hearts" hidden />
        </>
      }
      facts={[{ text: <Corner devAdmin={p.devAdmin} /> }]}
      // No time in the bar: the clock is drawn on the field (render clock.ts).
      time={null}
      actions={[]}
      panels={panels}
    />
  );
});
