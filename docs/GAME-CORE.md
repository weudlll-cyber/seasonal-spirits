# The game core (`packages/game-core`) — Seasonal Sumo prototype

Pure TypeScript: no network, no graphics, no clock and no randomness of its own. A match is
driven by `tick(dtMs, intents)`; its time is the sum of the `dt` values and every random
value comes from the seed (`mulberry32`), so the same seed and the same intents give the same
match. On the branch `proto/sumo` (NIGHT 2026-11-17) the core plays **Seasonal Sumo**, a rough
prototype the owner plays before anything is polished or merged; Seasonal Spirits is paused
(its last merged state is on `master`, the V5 rules on the tag `v5-prototype`). Since piece 5
of that night a match has a **game mode** — "sumo", "hill" (King of the Season) or "bomb"
(Halving Bomb) — over one shared core: physics, ghosts and bots, the halving's timing, the
countdown, the end and the recap frame are built once; a mode only adds its own rules
(`src/modes/`).

## Files

| File                      | What it holds                                                                  |
| ------------------------- | ------------------------------------------------------------------------------ |
| `src/config.ts`           | The config's shape, built from the settings (`configFrom`)                     |
| `src/rotation.ts`         | The rotation (`rotationOf`) and the games the admin panel starts               |
| `src/settings.ts`         | The settings schema: reader, now-or-next, the numbers that are not settings    |
| `src/settings-list.ts`    | Every setting: label, unit, range, step, default, modes, now or next           |
| `src/settings-doc.ts`     | docs/SETTINGS.md generated from the schema (`pnpm settings:doc`)               |
| `src/crowd.ts`            | Room for the crowd: King's smallest field and zone, their starting values      |
| `src/seasons.ts`          | Season order and the season clock                                              |
| `src/types.ts`            | Match state, ghosts and their phases, intents, events, result                  |
| `src/match.ts`            | `Match`: one tick in a fixed order; `halt` for a ghost a player takes over     |
| `src/modes/rules.ts`      | What a mode adds (`ModeRules`: start, turn, after), `scoreOf`, `areaOf`        |
| `src/modes/sumo.ts`       | Sumo: the arena halves at each halving; falls after the moves                  |
| `src/modes/hill.ts`       | King of the Season: the zone, its points, its jump and halving, bounces        |
| `src/modes/bomb.ts`       | Halving Bomb: points, the bombs, passing, the explosion                        |
| `src/geometry.ts`         | Distances, `stepGhost` in `subSteps` (momentum, walls), `dashVelocity`         |
| `src/arena.ts`            | The arena disc, its halving and easing, the walls closing in, spots, quarters  |
| `src/collisions.ts`       | Ghosts bump: apart, bounce, the dash hit's throw, the in-season push, credit   |
| `src/falls.ts`            | Falling off, the credit, out time, respawn                                     |
| `src/recap.ts`            | The recap's awards, two per mode (`awardsOf`)                                  |
| `src/jump.ts`             | The jump: in the air, its steering, when a ghost may jump                      |
| `src/windup.ts`           | The dash's optional wind-up: hold, release, its direction for the wire         |
| `src/standing.ts`         | Lives and sumo's variants: time limit, clock past the last season, end, winner |
| `src/bots/bot.ts`         | The sumo brain (`botIntent`) and the helpers every brain shares                |
| `src/bots/hill.ts`        | The hill brain: to the zone, push rivals out of it                             |
| `src/bots/bomb.ts`        | The bomb brain: a carrier chases, the others flee                              |
| `src/bots/human.ts`       | The human-like layer every bot plays through (`createBot`)                     |
| `src/human/perception.ts` | What a bot sees: the whole playing area, a reaction time late                  |
| `src/simulation.ts`       | One full bot match with the sanity list; `src/simulate.ts` is `pnpm simulate`  |
| `src/cli-args.ts`         | `pnpm simulate`'s arguments, checked in one place                              |
| `src/rng.ts`              | The seeded random source (`mulberry32`) of the game and the probe bots         |
| `src/index.ts`            | The package's exports                                                          |

Removed on this branch, because Sumo does not use them: coins, prices, shrines, securing,
the price board, the team check (`pnpm balance`), the fairness search and the human
stand-in round (`pnpm human`) — no balance work tonight (owner's addendum, 2026-11-17).

## One tick

In this order: time and season (a season turn is a halving: the event, then the mode's
`turn`), the arena's edge, falls ending and respawns, each ghost's intent and movement by id
(a dash first), collisions, the mode's `after` (sumo: new falls; hill: the zone's points and
bounces; bomb: points and passes), the teams knocked out, the end and its winner, the
countdown.

## Game modes (NIGHT 2026-11-17, piece 5)

| Mode   | Field                         | Match / halving                   | Score                                 | Recap                 |
| ------ | ----------------------------- | --------------------------------- | ------------------------------------- | --------------------- |
| `sumo` | the disc; past its edge falls | 5:00, every 75 s the arena halves | knockouts; none in Last One Standing  | Best pusher, Survivor |
| `hill` | walled square, nobody falls   | 3:00, every 45 s the zone jumps   | 1 point per second in the zone        | King, Bouncer         |
| `bomb` | walled square, nobody falls   | 3:00, every 20 s the bombs go off | 1 point per second; a carrier's halve | Hot hands, Cool head  |

- **Mode and times.** `cfg.mode` picks the rules; `configFrom(settings, mode)` builds a mode's
  config from the settings, its own times, field and countdown included (hill 180 s / 45 s;
  bomb 180 s / 20 s and a 5 s countdown — all placeholders). The server chooses the mode per
  match from the rotation (`rotationOf`; apps/server `match-host.ts`) — or a game the
  development admin panel starts by its slot's name (`STARTABLE_GAMES`, `startableGame`).
- **Settings** (NIGHT 2026-11-18). Every number that shapes play is a setting in one schema
  (`settings.ts`, `settings-list.ts`; the table is [SETTINGS.md](SETTINGS.md), generated by
  `pnpm settings:doc`); `readSettings` refuses anything out of range, off its step, unknown or
  missing; `nowPart` gives a running match the values that apply at once. `settings.test.ts`
  fails when a number of a config comes from no setting, or when game-core holds another numeric
  constant than those listed in `NOT_SETTINGS` (with the reason each is not gameplay).
- **Walls** (hill, bomb). A square of `wallHalf` around the middle at the start; `stepGhost`
  keeps a ghost inside it and takes the speed into a wall away (the speed along it stays). The
  arena's radius there is the walls' half side. With `walls.close` (King's and Halving Bomb's
  "Walls close in at each halving", King's on and Halving Bomb's off by default; owner's
  decisions 2026-11-19 — closing in, the bomb changed hands about 6.7 times as often) every halving
  sets it to max(`walls.smallest`, half × `walls.factor`) — 0.71 by default, the smallest 260 in
  King (from the crowd, below) and 250 in Bomb, never larger than it was (`arena.ts` `wallsAfter`, `closeWalls`) — and the walls ease in over the edge
  easing time like sumo's edge. The match moves every ghost against the walls where they are now
  (`Match.tick`), so a ghost they reach is pushed in with them: nobody falls, nobody is credited,
  nobody is stunned. Bots aim at the arena as it is (wander points, the middle), so they follow
  the walls. With the switch off the walls never move and a seed plays as before.
- **King of the Season** (`modes/hill.ts`). A zone (`hill.zoneRadius` 225 at the start, in walls
  of half side 450 — the owner's choice 2026-11-19; at these sizes it fills its quarter exactly)
  sits in the quarter of the season in season, half way to its corner (`quarterCentre`), its
  radius never more than half the walls' half side (it fits its quarter). Every
  ghost in it earns 1 point per second for itself and its team (`scoreMs`, whole ms, so the sum
  is exact). At each halving it jumps to the new season's quarter of the walls as they will be and its area
  halves, never below `hill.smallest` (225 → 160 → 130 → 130; with the walls closing in
  450 → 320 → 260 → 260 the zone still fits). **Room for the crowd** (`crowd.ts`, owner
  2026-11-19: at the old smallest field all 32 characters piled up in one corner over the zone):
  a crowd standing shoulder to shoulder takes 32 × (2 × 16)² = 32 768 square units; the smallest
  field holds four crowds (half side ≥ 181) and the smallest zone one and a half (radius ≥
  125.1), and the zone must fit its quarter (half side ≥ 2 × 125.1 = 250.2) — so King's "Smallest
  field" starts at 260 and the new "Smallest zone (radius)" at 130, each rounded up to its step;
  during the countdown the clients draw where it goes (`areaOf(...).next`). A ghost that leaves
  the zone within `hill.bounceMs` (1 s) of an opponent's dash into it is a bounce for that
  opponent — its own dash, not a plain push (NIGHT 2026-11-18; `lastTouch.dash`); a jump is
  nobody's bounce.
- **Halving Bomb** (`modes/bomb.ts`). Everyone earns 1 point per second. One bomb per
  `bomb.playersPerBomb` (8) players, at least one, goes to distinct random players (the
  match's seeded source). A carrier passes it by touching an opponent that holds none — never
  a teammate, and not back to the one that just gave it before `bomb.passBackMs` (1 s; the
  giver is `returnLocked` meanwhile and the clients mark it "no return", 2026-11-19); the
  nearest such opponent takes it. At each halving all bombs go off: each carrier's points
  halve, and new bombs go to random players.
- **Scores.** `scoreOf`: sumo knockouts, else whole points; a team's score is its players'
  scores summed; the wire carries both (u16).

## The sumo rules as built (all numbers placeholders)

- **Match and seasons.** 5:00, four seasons of 75 s in the real order from `startSeason`.
- **Arena.** A disc in the middle of the field, `arenaRadius` 400 at the start (25 ghost
  diameters across; the owner's live tuning eases a running arena to a new size,
  `Match.rescaleArena`, the same easing as a halving, `scaleArena` — but carrying the ghosts
  with its edge, `followEdge`, so a slider throws nobody off). Each team
  starts on its own quarter (Spring top left, Summer top right, Autumn bottom right, Winter
  bottom left), on a ring at `startSpread` of the radius.
- **Movement with momentum** (`stepGhost`, also the client's prediction): the held direction
  accelerates by `acceleration` while the speed along it is below `maxSpeed`; `friction`
  takes a share of the speed per second (exponential). A dash or a knock may go faster than
  running and then slows. A tick runs in sub-steps (`subSteps`): none moves a ghost more than
  a third of its radius even at the fastest the rules allow, and the contacts are resolved
  after each, so a ghost that reaches another always touches it (FIX 2026-11-17-3: before,
  ghosts crossed each other without a contact). `stepGhost` takes the same sub-steps, so the
  client's prediction moves exactly as a ghost that touches nothing.
- **Dash** (an action): the speed becomes `dashSpeed` towards the held direction (or
  along the motion); for `dashMs` the ghost knocks what it hits; the next dash only after
  `dashCooldownMs` — the core's rule, whatever a client sends. Not in the air. With the
  owner's wind-up on (`dashWindUpMs`, settings "Dash: wind-up" and its length, off by default;
  `src/windup.ts`, NIGHT 2026-11-18 piece 6) the press holds the ghost still, its direction
  fixed and on the wire for everyone (the glow and the line), and the dash goes on the first
  tick past the wind-up — not when the ghost has jumped or fallen meanwhile; the cooldown runs
  from the press.
- **Jump** (the other action, owner's idea, JUMP 2026-11-17, `src/jump.ts`; every mode): for
  `jump.airMs` (0.5 s) the ghost is in the air — it takes part in no collision, so no dash hits
  it and it pushes nobody, and it neither passes nor takes a bomb; it steers with `jump.steer`
  (a tenth) of the held direction, so it keeps almost the direction of its take-off (`airSteer`,
  which the client's prediction uses too); it falls only when it lands outside the arena. The
  next jump only after `jump.cooldownMs` (3 s), and only with `jump.enabled` — the owner's
  switch (off: the action does nothing). A rival's dash that overlaps it in the air is a dodge:
  one `dodge` event per jump (`noteDodges`, after every sub-step's contacts; NIGHT 2026-11-18:
  "Dodged!" on every screen). All placeholders, set with the live panel.
- **Collisions** (`collideGhosts`, grown from Spirits' soft separation): two ghosts on the
  arena that overlap are moved apart and bounce (`restitution`), the overlap shared by their
  push factors; the team whose season is in season pushes `inSeasonPush` harder. A dashing
  ghost throws the one it hits off at `knockSpeed` (times the in-season ratio) at least — set, not
  added, so a throw is about `knockSpeed / friction` long however many ticks the dash touches;
  the thrown ghost counts `knockWeight` heavier for `dashMs`, so a crowd behind it gives way
  instead of stopping it (the weight moves ghosts apart; it never makes a throw harder). Each
  remembers the last opponent that touched it; teammates give no
  credit.
- **Falling.** A ghost whose centre leaves the arena falls: +1 knockout for the last opponent
  that touched it within `creditMs`, and for its team; nobody scores without one. It falls
  for `fallMs` (the animation), is out until `outMs` after the fall, then respawns on its
  team's quarter (`respawnBand`, the settings `respawnInner`/`respawnOuter`: a quarter wide, from 0.25 to 0.75 of the radius, drawn
  faintly for a player while out) at the freest of a few seeded spots, protected for `protectMs` (nothing
  pushes it, it pushes nothing).
- **Halving** at 1:15, 2:30 and 3:45: the next season comes into season and the arena's area
  halves (radius × `sumo.shrink`, 0.71: 400 → 284 → 202 → 143); the edge eases in over `arenaShrinkMs`
  (slow, fast, slow). A ghost the edge passes under falls. During the 10 s countdown the
  clients draw the edge after the halving (`nextRadius`) as a dashed ring.
- **End.** Points: the team with the most knockouts wins; Last One Standing: see "Lives and
  the two variants". `result()` gives knockouts, falls and lives left per player, the scores and
  the ghosts still in per team, the teams knocked out in order, the winner and the last one
  standing, and each ghost's longest time on the arena without a fall. The end is staged like a
  halving (countdown, `match-end` event).
- **Places** (`ranked`, FIX 2026-11-17): the players in their final order — by the mode's
  score; in Last One Standing by survival: the last one standing, the winning team's ghosts
  still in, the others still in, then the rest by when they lost their last life (later out,
  better place), ties by their time on the arena (`aliveMs`), then knockouts. The server sends
  the recap's players in this order.
- **Recap** (`src/recap.ts`, every mode): two awards per mode from the result at the end —
  sumo Points "Best pusher" (most knockouts) and "Survivor" (longest without a fall); sumo Last
  One Standing "Last one standing" (the one ghost left, with its lives left; none when the time
  limit left several) and "Best pusher"; hill "King" (most
  seconds in the zone) and "Bouncer" (most bounces), bomb "Hot hands" (most passes) and "Cool
  head" (most points at the end). Of equal ones the lowest id gets it; a count of 0 earns
  nothing. (Before piece 5 "Best pusher" went to the first to reach the top; one rule for all
  six awards is simpler.)

## Lives and the two variants (LIVES 2026-11-17, `src/standing.ts`)

The owner after playing with the sliders: the smaller the arena, the more crowded and confusing
it gets — fewer players should be left in the late phases. All numbers are placeholders the owner
sets with the live panel.

- **Lives** (`sumo.lives`, 3). Every fall costs one (`checkFalls`); with lives left the ghost
  respawns as before, with none it stays out for the rest of the match (`advancePhases` skips the
  respawn; `outAtMs` holds when). Nobody takes its seat: the server fills seats with bots only
  at the start. Lives are read when a match starts. Inside the walls of hill and bomb nobody
  falls, so nobody loses one.
- **Variant** (`variant` of the match: `new Match(cfg, seed, roster, variant)`; the walled modes
  play `points`). The server picks it per match from `sumo.variant`: `points`, `last-standing`
  or `alternate` (Points, then Last One Standing, sumo match by sumo match).
- **Points.** Knockout points as before; the match ends at its time limit, or earlier once
  somebody is out of lives and only one team has ghosts left (`isOver`). Most points wins.
- **Last One Standing.** No points in the band; the last ghost with lives left wins, its team
  is the winning team (`decide`). If the last ones lose their last lives in the same tick, the
  lowest team order of them wins (then the lowest id). Bots push their teammates too once only
  their own team is left (`rivals`), so the match can end. `sumo.afterLast`, read every tick
  (the slider applies at once):
  - `stop-time` (default): the arena stops shrinking after the third halving and the match ends
    at its time limit; with several left the team with the most ghosts still in wins, ties by the
    most lives left in total, then the lowest team order — and no single last one is named;
  - `keep-halving`: after the third halving the arena halves every `sumo.halvingEveryMs` (75 s;
    the season turns with each) until one ghost is left; no time limit;
  - `stop-open`: the arena keeps its size after the third halving, no time limit, the last ghost
    in wins however long it takes; the clock has no deadline (`nextDeadline` null, no countdown;
    the band shows the time played).
- **Clock** (`clockOf`). Within the first seasons `seasonClock`; from the last one on the season
  never goes back (the setting may change mid-match): with a time limit it runs to the end,
  `keep-halving` turns the season at the next halving, `stop-open` has none.
- **Teams knocked out** (`noteKnockedOut`): a team whose every ghost is out of lives, in the
  order they went (two in one tick by team order) — the recap's order.

## Bots

**Seats.** Bots only fill missing players: every team has 8 seats (32 slots); a joining
player takes a bot's seat in the team with the fewest players at once (the ghost stops, its
dash and jump ready as a new ghost's, its place, lives, score and team kept; `halt`), a leaving one stands for the reconnect grace, then a bot takes the seat again
(apps/server `match-host.ts`). Teams stay equal at all times.

**The brains**, one per mode behind the same human-like layer. Hill (`bots/hill.ts`): to the
zone; inside it, at the nearest opponent in the zone, dashing when lined up close; with nobody
to push, its own spot in the zone. Bomb (`bots/bomb.ts`): a carrier chases the nearest
opponent that may take its bomb and dashes into it; the others flee from the nearest opposing
carrier within two dash ranges, bending towards the middle so they do not pin themselves to a
wall, and else walk to their wander point. Sumo (`botIntent`): near the edge back inward — within
its own `bots.edgeMargin` (140, with its slack), but at most `bots.edgeShare` (0.35) of the
edge's radius, never less than a ghost radius (`edgeMargin`): the full arena (400) keeps 140,
the last halving's arena (143) 50 (FIX 2026-11-17-4; 140 there left the bots only its middle and
Last One Standing without a time limit did not end; 0.15 of the radius everywhere ended every
match by elimination at 2–4 min) —; otherwise to the
nearest opponent it can push, approaching a little from the side of its own wander point
(an angle by id, moved on every `bots.wanderMs`, so bots do not all meet in one spot), and a
dash when within `bots.dashRange`, lined up (`bots.dashAimCos`), not near the edge — half a dash
range on from where it is stays inside, but at most `bots.edgeShare` of the radius, as the
margin (FIX 2026-11-17-5: the full half range left the last halving's arena only 31 around the
middle to dash from, and the last bots never dashed) — and the cooldown over; it aims at where
the target will be `leadMs` on (`leadPoint`, 0 unless bold, see below); with nobody to push, to
the wander point.

**The human-like layer** (`createBot`, owner requirement 2026-11-17), the same for every bot:

- it sees what a player's screen shows — the whole playing area (owner 2026-11-17) — a
  reaction time late (`perceive` in `src/human/perception.ts`);
- each bot's reaction time is drawn from `bots.reactionMs` (250–450 ms) and varies by
  ± `bots.reactionJitterMs` (50) per decision, in whole ticks;
- its direction carries aim noise of ± `bots.aimNoiseDeg` (6°) at average form;
- it dashes only when its brain has a target lined up, takes such a chance only with
  `bots.dashChance` × form (0.6: else too late) and never sooner than `bots.dashGapMs` (3 s)
  after its last dash — a calm player's pace (owner 2026-11-17); it hesitates for
  `bots.hesitateMs` now and then (`bots.hesitateChance` ÷ form), and its own edge margin is
  drawn from [`bots.edgeSlack`, 1] × `bots.edgeMargin` (some go too close to the edge);
- a rival dashing at it within `bots.dashRange` — or winding a dash up at it, the glow a player
  sees — heading at it as well as a bot lines up a dash (`underAttack`), it jumps over with `bots.jumpChance` × form (0.5) — as it sees it, a reaction
  time late, one decision per dash, only when its jump is ready: never a perfect dodge;
- once no halving is coming any more and fewer than `bots.boldAt` (8) ghosts are left it grows
  bolder (`boldness`, 0 … 1 with two left; FIX 2026-11-17-5: the last two ran in circles for
  minutes): it aims up to `bots.leadMs` (0.3 s) ahead of its target from its seen speed, its dash
  angle widens towards `bots.boldAimCos` (0.5), and after `bots.commitMs` (3 s, a quarter of it
  with two left) without a dash it attacks anyway, whatever its dash chance (`bolder`). Bold
  while halvings were still to come, every match ended before the third. In King of the Season
  nobody is knocked out, so the boldness never comes; there the bots always aim ahead, to hit
  the moving rivals in the zone (NIGHT 2026-11-18);
- its form drifts by up to ± `bots.formStep` every `bots.formEveryMs` within `bots.form`
  (0.85–1.15): sharper and steadier on a good run, sloppier in a weak spell;
- all of it from the bot's own seeded source, `botSeed(match seed, seat)`: runs repeat.

Tests: `src/bots/bot.test.ts` (the brain), `src/bots/human.test.ts` (delay respected, aim
noise within the band, form within its band, same seed same match), `src/bots/packs.test.ts`
(no group of more than 4 together longer than 15 s, nearly still less than 5 % of the time).

## `pnpm simulate --seed <n> [--mode sumo|hill|bomb]`

One full match, 32 bots, in 50 ms ticks as fast as the machine runs: the season timeline with
what each halving did, falls with and without credit, the score per team and per player, and
the sanity list — for every mode positions and speeds finite and one halving per season turn;
sumo: the arena halving its area each time, every knockout one credited fall and never by a
teammate; hill: the zone halving its area each time, nobody falling; bomb: nobody falling,
always one bomb per 8 players on distinct carriers. It exits 1 if a check fails. Seed 1 on
2026-11-17: sumo 519 falls in 5:00 (453 credited), 95–123 knockouts per team; hill 744–789
points per team, bounces 42–65 per player for the first eight; bomb 999–1260 points per team,
2–9 passes per player for the first ten.

## Configuration

Every value is a setting and a placeholder the owner decides: the table with ranges, defaults,
modes and "now or next match" is [SETTINGS.md](SETTINGS.md), generated from the schema; the
config's shape is `src/config.ts`, built from the settings by `configFrom`.
