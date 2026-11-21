// Seasonal Sumo — the band's top row as the kit's game bar (@seasonal/kit GameBar, night chain
// 2026-11-21 piece 4): the way back to the website (website mode only), the team line and the own
// lives (filled by team-line.ts and lives.ts by their ids), and the corner: the kit's theme
// toggle, "?" (help.ts), the sound (hud.ts bindMute) and, in the dev build, the admin link. No
// panels: the chat docks below the field (Dock.tsx). Rendered once; its props never change.

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
      actions={[]}
      panels={panels}
    />
  );
});
