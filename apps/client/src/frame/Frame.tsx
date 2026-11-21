// Seasonal Sumo — the frame around the play field in React with the kit's building blocks (night
// chain 2026-11-21 piece 4; owner decision 2026-11-20: the frame comes from the kit): the game
// bar in the band (Bar.tsx; the kit's focus mode while a match runs), the result frame
// (ResultCard.tsx) and, in website mode only, the docked chat (Dock.tsx). Rendered once and
// synchronously into the page's containers, before the game's modules look their parts up by id
// (hud.ts el); after that only the focus mode and the result's fit change (frame-store.ts).

import '@seasonal/kit/shell.css';
import '@seasonal/kit/fit.css';
import '@seasonal/kit/bar.css';
import '@seasonal/kit/frames.css';
import '@seasonal/kit/dock.css';
import '@seasonal/kit/call.css';
import { useFocusMode } from '@seasonal/kit/react';
import { useSyncExternalStore, type ReactElement } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { el } from '../hud.js';
import { Bar } from './Bar.js';
import { Dock } from './Dock.js';
import { frameSnapshot, subscribeFrame } from './frame-store.js';
import { ResultCard } from './ResultCard.js';

declare const __DEV_ADMIN__: boolean; // vite.config.ts: the dev build's admin link
declare const __WEBSITE_MODE__: boolean; // vite.config.ts: the back link and the chat, off today

interface Parts {
  readonly bar: HTMLElement;
  readonly result: HTMLElement;
  readonly dock: HTMLElement;
}

function Frame(p: { readonly parts: Parts }): ReactElement {
  const f = useSyncExternalStore(subscribeFrame, frameSnapshot);
  useFocusMode(f.running);
  return (
    <>
      {createPortal(<Bar websiteMode={__WEBSITE_MODE__} devAdmin={__DEV_ADMIN__} />, p.parts.bar)}
      {createPortal(<ResultCard signature={String(f.results)} />, p.parts.result)}
      {__WEBSITE_MODE__ ? createPortal(<Dock />, p.parts.dock) : null}
    </>
  );
}

export function mountFrame(): void {
  const parts = { bar: el('band-top'), result: el('result'), dock: el('dock') };
  const root = createRoot(el('frame'));
  flushSync(() => {
    root.render(<Frame parts={parts} />);
  });
}
