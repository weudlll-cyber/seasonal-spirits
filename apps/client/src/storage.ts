// Seasonal Spirits — the player's few remembered choices (mute, view mode) in localStorage.
// Storage can throw (private mode, blocked site data); then nothing is remembered.

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not remembered; the choice still holds for this page
  }
}
