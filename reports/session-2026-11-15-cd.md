# Session 2026-11-15-CD — unnamed dots, moving packs, coin pickup, help and feedback, fairness

**Client: http://localhost:5930** — to be confirmed at the handover.

Started from `master` (`9c2d85a`). Branches, stacked: `fix/dots-and-packs` → `fix/pickup` →
`feat/help-feedback` → `feat/fairness`. Nothing merged. In progress.

## 1. What the unnamed dots are (`fix/dots-and-packs`)

Every unnamed dot was a ghost. Nothing else on the field is drawn as a circle: coins are
diamonds, trails are lines, the minimap stays inside its box. Measured on the running dev
stack (a scratch Playwright script, 80 frames in "Near" and "Overview" at each size): at
desktop size 879 of 1889 ghosts on screen had no label, at phone size 1240 of 2211. Of
those, 806 and 1127 were carriers (mostly one coin) whose label the overlap rule dropped
because it collided with another label — even where the circles themselves stood apart, as
"Bot 13 · 1" is much wider than the gap between two ghosts; the other 73 and 113 carried
nothing, and for players only carriers were named at all. The pack's "1" was the old
fallback text: the coin count alone.

Changed: every ghost on screen is named — the own one "You", a carrier its name and coin
count, any other ghost (for players) its tag, the bot's number ("7"; "P5" for a player). A
label that finds no room takes its tag above, below, right or left of the ghost, and
otherwise stands further out on a thin leader line; labels still never overlap. Measured
again on the dev stack: 0 of 1330 (desktop) and 0 of 1875 (phone) ghosts without a label.

Tests: `labels.test.ts` "gives every ghost its full name where nothing collides", "labels
every ghost of a stacked crowd of ten, without any overlap", "keeps the own full label in a
crowd and draws it last", "gives the richer carrier the best spot, above its ghost, and still
names the poorer"; `readability.e2e.ts` checks in every sampled frame that every ghost on
screen has a label.

## 2. Why a pack stays together (`fix/dots-and-packs`)

**Cause.** The packs were collectors (patient and cautious bots of mixed teams, no hunters,
no steals at all) that all steered to the same coin: each took its nearest coin, so
neighbours shared one target — 4 of 5, 6 of 6, 9 of 9, 10 of 10 pack members on one coin up
to 950 units away — moved there as one blob and switched together to the next coin. Hunter
targeting played no part, so it was left alone.

**Fix (bots only).** A collector goes for the nearest coin no other ghost is closer to;
without one it walks to its own waypoint inside the shrines' square, spread over the field
by its id and moved on every `bots.waypointMs` (4000 ms, new placeholder), the next one as
soon as it is reached. The first try (fallback to the nearest coin) still left packs when the
field was nearly empty; the waypoint was added for that, and the "walk on" for a waypoint
reached early (a collector stood there 3.8 s otherwise).

Reproduction (scratch script, packs of ≥ 5 linked within 40 units, away from shrines, same
core > 15 s): seeds 1–5 before the fix had 9, 11, 6, 7, 4 packs, the longest 36.5 s; after
it seeds 1–10 have none, the longest group lasts 10.4 s. Standstill check, seeds 1–10: 0
episodes over 3 s. Test `packages/game-core/src/bots/packs.test.ts` "no group of more than 4
ghosts stays together longer than 15 s away from the shrines" (seeds 1–3) — fails on the
master code (seed 1: 36 050 ms, verified once with the fix stashed).

Balance stage 1, current config, N = 30 (seeds 1–30), next to the round 2 row in
docs/BALANCE.md: best player hunter 93.3 % (round 2: 73.3 %), cautious 6.7 % (26.7 %),
patient 0.0 %; spread-out collectors are easier prey.

### Own full match (Playwright, desktop, keyboard, dev server with the new bots)

Waited for a fresh match, played 5:00 for Team Spring, first half "Near", second half
"Overview" (V). Every sample checked: never a ghost on screen without a label (in
"Overview" all 32 named every time), never a label under the bar, no page errors. My blind
route secured 5.5, place 25 of 32. Screenshots `reports/screens/latest/crowd-near.png` and
`crowd-overview.png` (git-ignored): crowds at the shrines are named with leader lines, the
"Autumn shrine" label moves above its shrine where the Steal button covers the spot below.
Noticed: some labels sit on the bodies of neighbouring ghosts; ghosts crowd densely at the
shrines near the end of a season; in "Near" the label of a bottom shrine of another team
can be cut by the screen edge; some carriers hold 20 coins and more (Bot 14 · 21).
