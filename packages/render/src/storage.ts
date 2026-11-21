// Seasonal Spirits — the player's few remembered choices (mute, the help seen, light or dark) in
// localStorage, for the client and the viewer (moved here from the client for the look switch).
// Storage can throw (private mode, blocked site data); then nothing is remembered.

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeSetting(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // not removed; nothing reads it again (look-switch.ts carryOverLook)
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not remembered; the choice still holds for this page
  }
}
