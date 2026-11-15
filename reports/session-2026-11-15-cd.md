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

## 3. Coin pickup (`fix/pickup`)

**Measured.** The server picked a coin up when the centres were at most `pickupRadius` = 30
field units apart. The client drew an empty ghost with radius 14 (growing by 0.5 per carried
coin up to 30) and a coin with radius 10, at least 6 px and 4 px. So the drawn shapes touch
at 24 units for an empty ghost — it took coins 6 units early — and at up to 40 for a big
carrier — the coin vanished only once it was 10 units under its body. On top, the client
draws the ghosts 100 ms behind the newest state (render buffer, `BUFFER_MS` in main.ts) but
drew the coins from the newest state: at full speed (300 units/s) the drawn ghost was still
up to 30 units short when the coin disappeared. On a phone in "Near" (0.37 px per unit) the
6 px and 4 px minimums also enlarged both shapes. **Cause:** two sizes for one thing, and
coins and ghosts drawn from different moments.

**Fixed.** One definition in game-core: `ghostRadius(cfg, carried)` and `coinRadius` (new
placeholders `ghostRadius` 14, `ghostGrowthPerCoin` 0.5, `ghostGrowthMax` 16, `coinRadius`
10 — the drawn values; `pickupRadius` is gone). The server picks up when they touch
(`touchesCoin`); render draws with them (`ghostRadiusPx`, `coinRadiusPx`, minimums lowered
to 4 px and 3 px so "Near" is exact at both sizes). The client takes the field coins from
the buffered state of the moment the ghosts are drawn at (`stateAt`), so a coin disappears
when the drawn ghost touches it; no prediction. Only a phone's "Overview" still draws the
shapes larger than their size.

Tests: `field.test.ts` "an empty ghost / a carrier of 10 / a carrier at full size picks up a
coin at touching distance and not half a unit further" (fails on the old code: 24.5 was
taken); `interpolation.test.ts` "gives the field coins of the moment the ghosts are drawn
at, not the newest ones"; `sizes.test.ts` "draws a ghost with the game core radius, growing
with its coins", "draws a coin with the game core radius". This changes the balance a little
(an empty ghost reaches 24 instead of 30, a big carrier up to 40); part 5 starts from here.

## 4. Help and feedback (`feat/help-feedback`)

**Help overlay** (`apps/client/src/help.ts`): the five rules of CONCEPT.md §2a in plain words,
each with a small inline-SVG drawing made in code, and the controls for keyboard and touch; no
crypto terms. Opens on the first visit (remembered in localStorage through the guarded
storage helper), any time with "?" (key, or the "?" button in the band); one tap or any key
closes it, and that key reaches no game control.

**Steal feedback, server-authoritative:**

- New ghost flag `GHOST_CAN_STEAL` (16) in the existing flags byte, from the core's new
  `canSteal` (match running, not securing, cooldown over, an opponent carrier in range —
  `trySteal` now uses the very same check). The Steal button is lit only while the own
  ghost's flag is set, dimmed otherwise.
- A faint dashed ring of the steal range around the own ghost while an opponent carrier is
  within twice the range.
- A new server → client text message `{"kind":"steal","thief","victim","coins"}`, read by the
  shared `parseServerMessage`, sent by the server only to the two players involved, in the
  tick it happened, never during the result pause; the client shows "You stole 3 from Bot 7"
  / "Bot 7 stole 2 from you" for 2.5 s. Spectators get nothing.
- First design (a steal list inside the binary state) dropped: with 32 steals in one tick
  the worst-case state would have grown from 978 to 1107 bytes, past the Phase 0 bound of
  1 KB; the text message to two sockets keeps the state size unchanged.
- `SCENARIO=steal` (development server only, `envChoice` none/steal): every joining player
  is placed in the middle with 6 coins beside an opponent hunter carrying nothing — the
  seeded situation for the tests.

THREATS rows 26a (scenario), 29 (steal notice), 30 (the flag).

Tests: `server-message.test.ts` "reads a steal notice with only its known fields", "drops a
steal notice with a ghost out of range, no coins, or a thief robbing itself";
`match-host.test.ts` "tells a player robbed by a bot, and only that player", "lights the
Steal flag only while a steal would take something, and tells the thief", "sends no notice
to anyone for steals among bots"; `help.e2e.ts` (desktop and phone) "help appears on the
first visit, not on the second, and opens again with '?'"; `feedback.e2e.ts` (desktop,
second stack 3934/5934) "the Steal button is lit only with a target, and both sides of a
steal get a message". Screenshots `desktop-help.png`, `phone-help.png`, `desktop-steal.png`.
The first version of the feedback spec failed: the robbing hunter had walked off with the
loot by the time Space was pressed; it now presses as soon as the button lights.

## 5. Fairness search (`feat/fairness`)

### Step A — bot sanity

Traced where every strategy's coins go over five seeded matches (scratch script, seeds 1–5,
12 patient, 12 cautious, 8 hunter bots each). Two faults of the patient bot that no
reasonable player would make:

1. **It carried a full load past opponents without reacting**: loads up to 42 coins, robbed
   356 times (1269 coins). Fix: with at least `swapIn` coins and an opponent within
   `bots.threatRange` (150 units, new placeholder) it goes home at once and swaps, or banks.
2. **It let the halving halve its coins**: near a halving with fewer than 10 coins of the
   season it kept collecting — 734 old-season coins were carried into halvings. Fix: it
   banks them, unless the next season's coins it carries (from a swap) are more.

After the fix: robbed 236 times (517 coins), 102 old-season coins carried into halvings,
secured value 183 → 852.5 (same five matches). Swaps stay rare (8): a patient bot seldom
holds 10 coins of one season. Noticed and left (not the patient strategy): hunters still rob
each other back and forth when one is richer — 6801 steals between hunters in five matches.

Stage 1 again, current config, N = 30 (seeds 1–30): best player patient 10.0 % (before
0.0 %), cautious 41.7 % (6.7 %), hunter 48.3 % (93.3 %); mean secured value 13.7 / 16.9 /
17.2.

### Step B — timing

One configuration of 30 matches: 19.8 s (`time pnpm --filter … balance-cli.ts --matches 30`),
with 48 % CPU load from other work on the PC (the running `pnpm dev`: 32 bots, Vite, viewer).
The whole grid of 288 configurations would take about 96 minutes in one process — under
3 hours, so no dimension was dropped. It ran with 8 parallel processes on 14 cores (CPU load
51 % just before the start) through the new `pnpm fairness`.
