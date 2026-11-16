// Seasonal Spirits — the player's controls (CONCEPT.md §8): WASD or arrow keys, 1 to secure;
// on touch screens a virtual joystick under the left thumb. The Secure button for the right
// thumb lives in hud.ts. Only a direction and the action leave here.

import type { GameAction } from '@seasonal-spirits/protocol';

export interface Controls {
  steer: (dx: number, dy: number) => void;
  act: (action: GameAction) => void;
}

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const ACTION_KEYS: Record<string, GameAction> = { Digit1: 'secure' };

export function bindKeyboard(controls: Controls): void {
  const held = new Set<string>();
  const update = (): void => {
    let dx = 0;
    let dy = 0;
    for (const code of held) {
      const k = KEYS[code];
      if (k) {
        dx += k[0];
        dy += k[1];
      }
    }
    const len = Math.hypot(dx, dy);
    controls.steer(len > 0 ? dx / len : 0, len > 0 ? dy / len : 0);
  };
  window.addEventListener('keydown', (e) => {
    const action = ACTION_KEYS[e.code];
    if (action && !e.repeat) controls.act(action);
    if (!(e.code in KEYS) && !action) return;
    e.preventDefault();
    held.add(e.code);
    update();
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    update();
  });
  window.addEventListener('blur', () => {
    held.clear();
    update();
  });
}

const JOYSTICK_RADIUS = 60; // pixels from the touch-down point to full speed

// A joystick that appears where the left thumb touches down; pointer events, so a mouse
// drag on the same area works too.
export function bindJoystick(area: HTMLElement, knob: HTMLElement, controls: Controls): void {
  let origin: { x: number; y: number; id: number } | null = null;
  const show = (x: number, y: number): void => {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  };
  area.addEventListener('pointerdown', (e) => {
    origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
    area.setPointerCapture(e.pointerId);
    area.classList.add('active');
    area.style.setProperty('--ox', `${e.clientX}px`);
    area.style.setProperty('--oy', `${e.clientY}px`);
    show(0, 0);
  });
  area.addEventListener('pointermove', (e) => {
    if (origin?.id !== e.pointerId) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const len = Math.hypot(dx, dy);
    const k = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
    show(dx * k, dy * k);
    controls.steer(
      len > 4 ? dx / Math.max(len, JOYSTICK_RADIUS) : 0,
      len > 4 ? dy / Math.max(len, JOYSTICK_RADIUS) : 0,
    );
  });
  const end = (e: PointerEvent): void => {
    if (origin?.id !== e.pointerId) return;
    origin = null;
    area.classList.remove('active');
    show(0, 0);
    controls.steer(0, 0);
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
}
