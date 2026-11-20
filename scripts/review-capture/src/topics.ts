// Seasonal Sumo review capture — the rule that keeps review images from piling up (owner decision
// 2026-11-21: review screenshots and contact sheets stay out of the repository, on the owner's PC,
// and do not pile up): before a run writes a topic's images, that topic's previous images and
// sheets go, so each topic holds only its latest run. A topic is a folder under
// reports/screens/review/ (a game, `own-marker`, `minimap`) and its sheets beside it,
// sheet-<topic>.png and sheet-<topic>-….png. The browser e2e specs keep their screenshots by the
// same rule, one topic per spec under reports/screens/latest/ (apps/client/e2e stack.ts).

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

const RUN_FILE = '.run'; // in a topic's folder: the run that last cleared it

// For a topic written over a run of several processes (the e2e specs: Playwright may start a new
// worker within a run): cleared on its first write in run `runId` and never again in that run —
// the marker file holds the run that cleared it. Returns the topic's folder.
export function clearOncePerRun(root: string, topic: string, runId: string): string {
  const dir = path.join(root, topic);
  const marker = path.join(dir, RUN_FILE);
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === runId) return dir;
  clearTopic(root, topic, null);
  fs.writeFileSync(marker, runId);
  return dir;
}
