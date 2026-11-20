# Planner's look 2026-11-20 — the review sheets and the owner's word on an and ao

Branch `proto/sumo`, started on `409d70e`. One piece per group, each its own commit, pushed; not
merged. CI is the planner's to check.

## State

| Piece | What | Commit |
| ----- | ---- | ------ |
| 1 | Late Sumo closer on the desktop with 8 or fewer standing | `e2469c5` |
| 2 | The spectator's start in Dark: the capture, not the client | `8f82036`, `2af4f29` (its call site, left out of the first) |
| 3 | Off the island at world scale, behind the island at its back | `2c504cb` |
| 4 | The help card's fade (an), Last One Standing's list by time out (ao) | `cee5e24` |
| — | Capture again, sheets, this report | see git log, "docs: the planner's look captured again" |

## What changed

1. **Late Sumo on the desktop.** From 600 px the zoom cap (a body at most 6 % of the shorter
   side) holds only while more than 8 characters stand (render `FEW_STANDING`). With 8 or fewer,
   the camera comes closer until the island with its rock fills two thirds of its room
   (`CLOSE_FILL`). On a desktop that room is the usable height. The camera never comes closer
   than a phone's fit and never goes further out than the cap. Client and viewer share
   `cameraBox`.
2. **The spectator's start in Dark.** The client was fine. On the dev server a spectator at
   1280 × 800 sees the start screen whole until 1.3 s, then a 0.4 s fade, hidden by 2 s, the same
   in Light and Dark. The capture shot Light, switched the look and shot Dark about half a second
   later, inside that fade. It now reloads the page in each look and shoots the start screen right
   away (`Camera.shootStart`). It logs when the screen was already going; in this run it never
   was.
3. **Off the island.** The large character in the sky was a jump that had left the island at its
   back as the halving took the ring away. It was drawn lifted and 1.5 times larger, its shadow
   in the sky. Now a character off Sumo's island keeps its standing size, whether falling or in
   the air beyond the edge. It is not lifted and has no ground marks (render `offIsland`). One off
   the back is drawn before the island's body, which hides it (`offBack`, `drawFallsBehind`
   through `drawField`'s `behind`). One off the sides or the front stays in front. A fall no
   longer shrinks as it drops.
4. **an:** while more of the help card lies below, a fade shows at its bottom edge. It stays
   there as the card scrolls and is gone at the end (`moreBelow`, `#help .card.more`).
   **ao:** in Last One Standing the players list and the own place line say "out at 1:42" in
   match time or "still in" (`playerText`). For this the recap now carries each player's `outMs`,
   checked by `readRecap` (THREATS row 33).

## The capture again

`pnpm review:capture sumo-points sumo-last-one-standing`: both runs per game (player on the
desktop with a phone spectator and the viewer, then player on the phone with a desktop
spectator), 92 moments, 388 pictures, 11 sheets. Every sheet was looked at, and every picture
named below at full size.

Measured: no text cut or overlapping. DOM contrast is at least 4.53:1 (the 1.09 of "Dash" is
the known conic-gradient false measurement). Smallest fonts: desktop 12 px, phone 13 px, viewer
panel 10.8 px. The values are the same as in the last capture.

| Fix | The picture that shows it |
| --- | ------------------------- |
| 1 Late Sumo | `sumo-points/desktop-dark-player-21-season-4-start`: 2 standing, the island about 585 of 1280 px wide (was about 430 px, a third); the viewer `sumo-points/big-*-viewer-21-season-4-start` the same |
| 2 Spectator start | `sumo-points/desktop-dark-spectator-01-start-screen`: title and island opaque, as in its Light twin; every `*-01-start-screen` of both games, both looks, desktop and phone |
| 3 Off the island | `sumo-last-one-standing/desktop-dark-player-16-halving-2-moving`: two going over the back edge ("Aaah!") behind the island's rim, one off the left side in front, all at standing size; `sumo-points/desktop-dark-spectator-13-halving-2-moving`: a side fall in front at standing size |
| 4 an | `sumo-points/desktop-light-player-05-help-open`: the last line fades into the card's white at its bottom edge |
| 4 ao | `sumo-last-one-standing/desktop-light-spectator-21-result`: "1. Bot 18 still in", then "out at 3:49" … "out at 2:35"; `desktop-*-player-23-result`: "Your place: 31 of 32 — out at 1:21" |

Sheets (`reports/screens/review/`):

- Sumo · Points: `sheet-sumo-points-desktop-1…2`, `-phone-1…2`, `-big`. The match was shorter
  than in the night's capture, so there is no `desktop-3` any more.
- Sumo · Last One Standing: `sheet-sumo-last-one-standing-desktop-1…3`, `-phone-1…2`, `-big`.

## Files

Lines before → after, `409d70e` → head:

| File | Lines |
| ---- | ----- |
| `apps/client/e2e/play.e2e.ts` | 143 → 143 ("1 knockout" accepted) |
| `apps/client/index.html` | 609 → 621 |
| `apps/client/src/help.test.ts` | new → 19 |
| `apps/client/src/help.ts` | 238 → 262 |
| `apps/client/src/result.test.ts` | 31 → 40 |
| `apps/client/src/result.ts` | 174 → 192 |
| `apps/client/src/scene.test.ts` | 119 → 125 |
| `apps/client/src/scene.ts` | 219 → 228 |
| `apps/server/src/recap.test.ts` | 109 → 109 |
| `apps/server/src/recap.ts` | 26 → 32 |
| `apps/viewer/src/main.ts` | 188 → 202 (the ghosts' style moved into `styleOf`) |
| `docs/BACKLOG.md` | 1532 → 1580 |
| `docs/CLIENT.md` | 331 → 345 |
| `docs/SERVER.md` | 212 → 213 |
| `docs/THREATS.md` | 101 → 101 |
| `packages/protocol/src/messages.ts` | 87 → 88 |
| `packages/protocol/src/recap-message.ts` | 67 → 72 |
| `packages/protocol/src/server-message.test.ts` | 149 → 175 |
| `packages/render/src/fall.test.ts` | 31 → 31 |
| `packages/render/src/fall.ts` | 104 → 122 |
| `packages/render/src/falls.test.ts` | new → 113 |
| `packages/render/src/field.ts` | 174 → 211 (`drawBehind` split out of `drawField`) |
| `packages/render/src/ghosts.ts` | 221 → 236 |
| `packages/render/src/index.ts` | 45 → 46 |
| `packages/render/src/zoom.test.ts` | 85 → 140 |
| `scripts/review-capture/src/main.ts` | 114 → 114 |
| `scripts/review-capture/src/shoot.ts` | 67 → 108 (`once` a method, `shootStart`) |

Reused:

- `cameraBox`, `halfPx` and `playBox` for the closer camera.
- The protocol's `GHOST_FALLING` and `GHOST_OUT`.
- The break-off's behind/front order (`breaks.draw(…, 'behind')`) for the falls behind.
- `drawBody` for those falls.
- game-core's `outAtMs` for the time out.
- render's `mmss` for "out at 1:42".
- The client's `counted`.
- The capture's `isDark`, `toggle` and `measurePage`.
- The test `canvas-recorder`.

Dependencies: none new.

Removed:

- The fall's shrink as it drops.
- The four- and five-argument forms of `drawField`: `behind` now travels with its memory.

## Noticed, left alone

- On a phone the help card cannot be scrolled: a touch on the overlay closes it (help.ts, "one
  tap closes"). The new fade says there is more, but a phone cannot reach it. It needs the
  owner's word: a "More" button, or a scroll that does not close the card.
- The match time in "out at" is rounded up like the clock (`mmss`). A player out at 1:41.2
  reads "out at 1:42".
- The rotation puts Halving Bomb after Sumo, so every run's "next match" shows Bomb.
- The night chain's pieces (`cbb94ba` … `409d70e`) had CHECKS rows but no CLOSED entry. The entry
  is added with this commit.
