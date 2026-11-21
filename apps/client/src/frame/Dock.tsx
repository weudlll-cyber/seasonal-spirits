// Seasonal Sumo — the docked chat with the call slot (@seasonal/kit ChatDock, night chain
// 2026-11-21 piece 4), website mode only and so hidden today: the website's chat for the game's
// room in the website's chat frame, no call linked (the kit keeps the slot hidden then). The
// room's name on the website needs the owner's word.

import { ChatDock, WebsiteChatFrame, useDockView } from '@seasonal/kit/react';
import type { ReactElement } from 'react';

const CHAT_ROOM = 'seasonal-party';

export function Dock(): ReactElement {
  const view = useDockView();
  return (
    <ChatDock
      chat={<WebsiteChatFrame room={CHAT_ROOM} sandboxed />}
      phone={view === 'phone'}
      bar="line"
      callId={null}
    />
  );
}
