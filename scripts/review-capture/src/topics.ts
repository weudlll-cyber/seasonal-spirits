// Seasonal Sumo review capture — the rule that keeps review images from piling up (owner decision
// 2026-11-21: review screenshots and contact sheets stay out of the repository, on the owner's PC,
// and do not pile up): before a run writes a topic's images, that topic's previous images and
// sheets go, so each topic holds only its latest run. A topic is a folder under
// reports/screens/review/ (a game, `own-marker`, `minimap`) and its sheets beside it,
// sheet-<topic>.png and sheet-<topic>-….png.

import fs from 'node:fs';
import path from 'node:path';

// The topic's sheets in `root`.
export function clearSheets(root: string, topic: string): void {
  if (!fs.existsSync(root)) return;
  for (const f of fs.readdirSync(root))
    if (f === `sheet-${topic}.png` || f.startsWith(`sheet-${topic}-`))
      fs.rmSync(path.join(root, f));
}

// The topic's previous run in `root`: its sheets and its folder's images; with `games` (their
// folder names) only those games' images, for a run that shoots them again and keeps the others —
// together they are the latest run. The folder is there afterwards.
export function clearTopic(root: string, topic: string, games: readonly string[] | null): void {
  clearSheets(root, topic);
  const dir = path.join(root, topic);
  if (games === null) fs.rmSync(dir, { recursive: true, force: true });
  else if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir))
      if (games.some((g) => f.includes(`-${g}-`))) fs.rmSync(path.join(dir, f));
  fs.mkdirSync(dir, { recursive: true });
}
