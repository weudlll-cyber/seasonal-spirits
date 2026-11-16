// Seasonal Spirits — records what the real client receives, sends and draws, for the latency
// measurement (latency.measure.ts): every state with its arrival time, every text message
// sent, every key event and, per frame, the drawn own ghost and the moments the frame shows.

import type { Page } from '@playwright/test';
import type { ClientView } from './stack.js';

export interface RecordedFrame extends Readonly<ClientView['timing']> {
  own: { x: number; y: number } | null; // the own ghost as drawn
}

export interface Recording {
  states: [number, number[]][]; // performance.now() at arrival, the state's bytes
  sent: [number, string][]; // performance.now() at send, the text message
  keys: [number, 'keydown' | 'keyup', string][]; // the event's timeStamp, type, code
  frames: RecordedFrame[];
}

// Runs in the page before the client's own script: wraps WebSocket, listens to the keys and
// reads window.__client once per frame (main.ts writes it every frame).
function record(): void {
  const rec: Recording = { states: [], sent: [], keys: [], frames: [] };
  (window as unknown as { __recording: Recording }).__recording = rec;
  const Native = window.WebSocket;
  class Recorded extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      this.addEventListener('message', (e: MessageEvent<unknown>) => {
        if (e.data instanceof ArrayBuffer) {
          rec.states.push([performance.now(), Array.from(new Uint8Array(e.data))]);
        }
      });
    }
    override send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      if (typeof data === 'string') rec.sent.push([performance.now(), data]);
      super.send(data);
    }
  }
  window.WebSocket = Recorded;
  for (const type of ['keydown', 'keyup'] as const) {
    window.addEventListener(type, (e) => rec.keys.push([e.timeStamp, type, e.code]), true);
  }
  let last = -1;
  const loop = (): void => {
    const c = (window as unknown as { __client?: ClientView }).__client;
    if (c && c.timing.frameMs !== last) {
      last = c.timing.frameMs;
      rec.frames.push({ ...c.timing, own: c.own && { x: c.own.x, y: c.own.y } });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export async function installRecorder(page: Page): Promise<void> {
  await page.addInitScript(record);
}

export async function readRecording(page: Page): Promise<Recording> {
  return page.evaluate(() => (window as unknown as { __recording: Recording }).__recording);
}

// The newest state's bytes, for steering by what the client knows.
export async function latestBytes(page: Page): Promise<number[] | null> {
  return page.evaluate(
    () => (window as unknown as { __recording: Recording }).__recording.states.at(-1)?.[1] ?? null,
  );
}
