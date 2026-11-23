// Seasonal Sumo — the docked chat (kit ChatDock), website mode only: the website's chat for the
// room `seasonal-party` in its sandboxed chat frame, no call linked.

import { ChatDock, WebsiteChatFrame, useDockView } from '@seasonal/kit/react';
import type { ReactElement } from 'react';

const CHAT_ROOM = 'seasonal-party';

export function Dock(): ReactElement {
  const view = useDockView();
  return (
    <ChatDock
      chat={<WebsiteChatFrame room={CHAT_ROOM} />}
      phone={view === 'phone'}
      bar="line"
      callId={null}
    />
  );
}
