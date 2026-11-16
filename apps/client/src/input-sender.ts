// Seasonal Spirits — when the client sends its direction (session 2026-11-16-RESPONSE).
// A changed direction goes out at once, unless the last send was less than SEND_GAP_MS ago;
// then the next frame's flush sends it. A direction equal to the last one sent is never sent.

export interface Direction {
  dx: number;
  dy: number;
}

// At most one direction per 60 ms: never more than 17 in any second, so with actions and
// signals a player stays inside the server's 20 messages per second (MAX_INPUTS_PER_SECOND).
// Placeholder — owner decides (before 2026-11-16: 100 ms, and only on the next frame).
export const SEND_GAP_MS = 60;

export class InputSender {
  private dir: Direction = { dx: 0, dy: 0 };
  private sent: Direction = { dx: 0, dy: 0 };
  private lastSendAt = -Infinity;

  get direction(): Direction {
    return this.dir;
  }

  // A new direction from the controls.
  hold(dir: Direction): void {
    this.dir = dir;
  }

  // The held direction if it is to be sent now: it differs from the last one sent and the
  // gap has passed. Asked at every change and every frame.
  due(now: number): Direction | null {
    if (this.dir.dx === this.sent.dx && this.dir.dy === this.sent.dy) return null;
    if (now - this.lastSendAt < SEND_GAP_MS) return null;
    this.sent = this.dir;
    this.lastSendAt = now;
    return this.dir;
  }
}
