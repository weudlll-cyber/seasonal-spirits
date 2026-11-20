# The own character found at a glance — 2026-11-20

Branch `proto/sumo`, started on `4eb0e51`. One piece, one commit, pushed; not merged. CI is the
planner's to check.

The owner's observation (desktop, Sumo, crowd in the middle): the own character was still very
hard to see. The small "You" pill sat under a "Dodged!" bubble, the thin white ground ring
vanished on the grass, and other characters stood in front of it. The owner decided on the
planner's proposals the same day. An addition followed while the piece was in progress: in
Halving Bomb the carried bomb, its fuse and its spark stay fully visible, the arrow sits above
the bomb, and the carrier's pulse and the ring both stay readable.

## What changed

- **Drawn last.** The own character is drawn after every other character and after what stands
  on the island (render `ghosts.ts` `drawStanding`), at the same size as the others. It is still
  behind the crown, the HUD and the banners.
- **Ground ring.** A thick ring in the own team's colour with a white edge and an ink outline, 1.6
  × the body's width (render `own.ts` `drawOwnRing`). It breathes between 1.0 and 1.12 × once a
  second. It is drawn right before the own body, over the feet of those in front: the first
  capture showed a crowd hiding it under the old order. The respawn pulse stays.
- **Arrow above.** A large down arrow in the team's colour, white-edged and ink-outlined, with a
  white "YOU" above it, bobbing 3 px once a second (`drawOwnMarker`). It is about twice the old
  triangle: 30 × 24 px plus its edge.
  - It stands above whatever the character reaches up to: the hat, a carried bomb with its fuse
    and spark, or the "no return" mark (render `ghostReach`; a 9 px gap clears the spark's glow).
  - It is drawn over everything of the field.
  - It never goes so high that "YOU" goes under the top bar; then it stands lower, over the hat.
    The capture showed King's zone at the top edge cutting it off.
  - The first capture showed Spring's green arrow fading into Spring's grass. The white edge came
    from that.
- **Arrow box.** No other label and no other "Dodged!" goes in the arrow's box
  (`ownMarkerBox`): placed labels avoid it, and bubbles that would touch it are left out.
  - The own "Dodged!" stands to the left of the arrow.
  - The own label "You · n" stands to its right, or to its left when the right is taken. It
    first looks for room clear of every character, and only goes over a character when neither
    side has room. The capture showed it over another carrier's bomb.
  - The own label is placed first, so it is never under another label.
- **Glow.** A soft white glow, 3 px, round the own character's outline. It is painted once into
  its own sprites (render `sprites.ts`), so it costs nothing per frame.
- **Off screen.** When the own character is outside the visible field, a small arrow in its
  team's colour at that edge points to it (`drawOwnOffScreen`).
- **Help.** The help card scrolls with a finger or the mouse wheel. It closes with the "×" at its
  top right, a tap outside it, or any key (client `help.ts`, index.html). Before, every touch
  closed it on a phone.
  - This point came from the last report's "noticed" list. It was not in BACKLOG OPEN, so there
    was nothing to move. It is recorded under CLOSED.
  - The legend and the help's drawing of the own marks show the new ring and arrow.

Ring contrast: the ring's outer edge is its ink outline.

| Season | Light | Dark |
| ------ | ----- | ---- |
| Spring | 8.37:1 | 4.87:1 |
| Summer | 8.68:1 | 5.01:1 |
| Autumn | 8.22:1 | 4.07:1 |
| Winter | 11.45:1 | 5.90:1 |

Every value is at least 3:1 (render `palette.test.ts`). The white edge inside the ink reads at
13:1 or more against the ink.

## Tests

`packages/render/src/own.test.ts` is new. It checks:

- Only the own character has the ring (1.6 × its width) and the arrow; a spectator gets neither.
- The ring breathes: 1.12 × after half a beat, back after a full beat.
- The respawn pulse grows round the own character only.
- The own character is drawn after every other character, also after those in front, at their
  size. Its ring is drawn after the others' bodies and right before its own.
- In a crowd of players who all just dodged:
  - No other label overlaps the arrow's box. The own label sits beside the box and overlaps no
    other label.
  - No other "Dodged!" overlaps the box. The own "Dodged!" sits to its left.
- With a character on one side of the arrow, the own label takes the free side. With characters
  on both sides, it still stays beside the arrow.
- Carrying a bomb, every circle of the bomb, its shine and its spark lies below the arrow's box.
- At the top edge, "YOU" stays below the bar.
- Off screen, one arrow at the right edge points to the character; on screen there is none.

Each of the box, the side and the top-edge tests was checked against a copy of the code with its
rule removed, and failed there.

Other tests:

- `ghosts.test.ts` lost its old own-mark tests; they moved to `own.test.ts`.
- `sizes.test.ts` and `no-return.test.ts` follow `ghostReach` without its own case.
- `palette.test.ts` names the ring.
- `help.e2e.ts` checks that a touch on the card (phone) or the wheel (desktop) scrolls it and
  leaves it open; that "×" closes it on the phone; and that a click beside the card closes it.
- `scripts/review-capture/src/own-moments.test.ts` is new: the moments of the new capture.

## The capture

`pnpm review:own-marker`: Sumo · Points, King of the Season and Halving Bomb, each with two calm
players in the same match (desktop and phone), in Light and Dark. The shots are each mode's
densest moment once per season, so every season's ground shows.

- Sumo: the first seconds and a crowd.
- King: the own character in a full zone.
- Bomb: the own character carrying a bomb in a crowd. When none came in a season, its last
  seconds were shot instead ("late").

The final run has 60 pictures; the sheet is `reports/screens/review/sheet-own-marker.png`,
written locally and not committed (since 2026-11-21, owner decision).

- **Earlier runs.** The first full run, a second run and a Bomb-only run each led to a fix (ring
  order, arrow edge, label side). King was shot again after the top-edge fix. The sheet holds
  the final state of all three games.
- **Every season's ground** shows in Light and Dark, desktop and phone: Spring, Summer and Autumn
  in all three games, Winter in King and Bomb. Sumo's last season brought no shot in the final
  run; its match ended before the last seconds were caught.

Each picture was looked at. Two things were checked in each: whether the own character is found
at a glance, and whether a label covers the arrow.

| Moment (Light and Dark each) | Desktop | Phone |
| --- | --- | --- |
| Sumo first seconds (Spring) | at a glance | at a glance |
| Sumo season 1 crowd (Spring) | at a glance | at a glance |
| Sumo season 2 crowd (Summer, halving banner) | at a glance | at a glance |
| Sumo season 3 crowd (Autumn) | at a glance | at a glance |
| King first seconds (Spring) | at a glance | at a glance |
| King season 1 full zone (Spring) | at a glance | at a glance |
| King season 2 full zone (Summer) | at a glance | at a glance; Dark: the minimap (HUD) covers "YOU", the arrow and ring show |
| King season 3 full zone (Autumn) | at a glance; Light: "YOU" stands over a character behind, readable | at a glance |
| King season 4 full zone (Winter) | at a glance | at a glance |
| Bomb first seconds (Spring) | at a glance | at a glance |
| Bomb season 1 late (Spring) | at a glance | at a glance |
| Bomb season 2 carrying in a crowd (Summer) | at a glance | at a glance |
| Bomb season 3 carrying in a crowd (Autumn) | at a glance | at a glance |
| Bomb season 4 (Winter) | carrying in a crowd, at a glance | late, carrying, at a glance |

- **Labels.** No label and no "Dodged!" covers the arrow in any of the 60 pictures. Only the HUD
  may come over it, as decided; it did once (the minimap, see the table).
- **Bomb, fuse and arrow.** In every Bomb picture of the own character carrying, the bomb, its
  fuse and its spark are all visible above the character, and the arrow stands above the bomb,
  not over it. The carrier's orange pulse and the ring in the team's colour both read together.
  Seen at full size in `desktop-light-player-04-halving-bomb-season-3-carrying-bomb-crowd`,
  `phone-light-player-04-…-season-3-carrying-bomb-crowd` and their Dark twins.

## Files

Lines before → after, `4eb0e51` → this commit:

| File | Lines |
| ---- | ----- |
| `README.md` | 107 → 109 |
| `apps/client/e2e/help.e2e.ts` | 43 → 55 |
| `apps/client/index.html` | 621 → 645 |
| `apps/client/src/help.ts` | 262 → 284 |
| `docs/BACKLOG.md` | 1580 → 1605 |
| `docs/CLIENT.md` | 345 → 365 |
| `package.json` | 43 → 44 |
| `packages/render/src/canvas-recorder.ts` | 61 → 71 (where each text was filled) |
| `packages/render/src/ghost-labels.ts` | 104 → 108 |
| `packages/render/src/ghosts.test.ts` | 218 → 171 (own marks moved to own.test.ts) |
| `packages/render/src/ghosts.ts` | 236 → 275 (`drawOverBodies`, `drawBubbles` split out) |
| `packages/render/src/jump.ts` | 101 → 109 (`dodgedBox`) |
| `packages/render/src/labels.ts` | 174 → 199 (`beside`) |
| `packages/render/src/legend.ts` | 37 → 40 |
| `packages/render/src/no-return.test.ts` | 74 → 72 |
| `packages/render/src/own.test.ts` | new → 250 |
| `packages/render/src/own.ts` | 102 → 191 |
| `packages/render/src/palette.test.ts` | 43 → 44 |
| `packages/render/src/palette.ts` | 130 → 127 |
| `packages/render/src/reach.ts` | 51 → 45 |
| `packages/render/src/sizes.test.ts` | 39 → 35 |
| `packages/render/src/sprites.ts` | 75 → 99 |
| `scripts/review-capture/package.json` | 20 → 21 |
| `scripts/review-capture/src/main.ts` | 114 → 107 (`slug`, the wait for the match moved to pages.ts) |
| `scripts/review-capture/src/moments.ts` | 111 → 111 (`inZone` exported) |
| `scripts/review-capture/src/own-marker.ts` | new → 84 |
| `scripts/review-capture/src/own-moments.test.ts` | new → 83 |
| `scripts/review-capture/src/own-moments.ts` | new → 67 |
| `scripts/review-capture/src/pages.ts` | 63 → 84 |
| `scripts/review-capture/src/player.ts` | 89 → 91 (a calm player) |
| `scripts/review-capture/src/sheets.ts` | 111 → 163 (`makeFlowSheet`, `shootPage` shared) |
| `reports/screens/review/sheet-own-marker.png` | new (removed from git 2026-11-21: local only) |

Reused:

- **Render.**
  - The respawn pulse, `PULSE_MS`, `drawRespawnBand`.
  - `ghostReach` and `bombReach` for where the arrow goes.
  - `placeLabels`' `avoid` for the arrow's box, `overlaps` and `Rect`.
  - `clearBubble`, `dodgedAt` and `DODGED_BOX` for the bubbles.
  - The sprite cache for the glow.
  - `seasonColour` and `look().ink`, `visibleArea` for the edge arrow, `byDepth`, `drawBody`.
- **Tests.** `palette.test.ts`' contrast test for the ring. The `canvas-recorder` and `bodies`.
- **Capture.**
  - `startStack`, `openClient`, `openViewer`, `startGame`, `readClient` and `Camera`.
  - The `Director`'s `inZone`.
  - `startPlayer` (with a calm option).
  - The sheets' `parse`, `cell`, `page` and `LAYOUT`.

Dependencies: none new.

Removed:

- The thin white ring and the small triangle (`drawOwnPointer`).
- `POINTER_REACH`.
- `ghostReach`'s own case and its `ownId` parameter.
- The palette's `marker` colour in Light and Dark.
- The help's "tap anywhere closes".
- The old own-mark tests in `ghosts.test.ts`.

Moved out:

- `slug` and the wait for a match, from the capture's `main.ts` to `pages.ts`.
- The sheet page's shot, into `shootPage`.

## Noticed, left alone

- The crown (King's leader mark) is drawn over the own body when the own character leads. That
  is as decided ("behind the crown"), but in a crowd it can cover part of the own character for
  a moment.
- On a phone the minimap (HUD) can cover "YOU" when the own character is in the top right
  corner. It is allowed, but the arrow could avoid the minimap's corner if wanted.
- In one King shot the own character had just left the zone when the "full zone" moment was
  shot. The capture checks the zone a frame before it shoots.
- Sumo's last season (Winter) was not shot in the final run. Winter's ground is covered by King
  and Bomb.
- `pnpm verify:changed` once timed out a game-core bot test (`human.test.ts`, 5 s) while the
  capture ran in parallel. Alone it passes in 3.2 s; the final run passed with nothing in
  parallel.
