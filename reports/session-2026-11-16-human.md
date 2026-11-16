# Session 2026-11-16-HUMAN — can a human collect coins against bots?

Branch `feat/human-feel` from `feat/night-2026-11-16` (not merged). Nothing merged, no config
default changed; every trial is a switch whose default is today's behaviour.

Owner's observations 2026-11-16 (playing the night branch against bots only): as a human it
is almost impossible to collect coins; groups of ghosts still form and dissolve late (a group
of about eight just below the own shrine, carriers with 6–7 coins).

**Working tree**: the permission rules refused a separate git worktree, so this session works
in the normal working tree on `feat/human-feel`. The running `pnpm dev` server keeps the night
branch's code in memory (no file watch); the client Vite serves may reload changed game-core
files — all of them default to today's behaviour. At the handover the working tree goes back
to `feat/night-2026-11-16` and `pnpm dev` restarts from it.

## The instrument (commit "feat: human round instrument, bot sight trials off")

- **Stand-in** (`packages/game-core/src/human/standin.ts`): takes seat 1; sees only a player's
  "Near" view, decides a reaction time late (300 ms, placeholder), collects the nearest coin
  it sees, secures at its shrine before every deadline. Never part of the balance pool.
- **The "Near" view, from the client's constants** (`cameraSpan` 1100 field units along the
  shorter side of the screen below the 104 px bar, render `follow`): a desktop window of
  1280 × 800 — and 1920 × 1080 alike — shows **2000 × 1100** field units (the whole field width,
  1100 of the height); a phone in portrait (Pixel 7, 412 × 915 CSS pixels) shows **1100 × 2000**.
- **Trial switches** (off by default; `packages/game-core/src/bots/perception.ts`): T1
  `bots.viewRadius`, T2 `bots.reactionMs`. T3 (fewer bot seats beside a human) is a parameter
  of the measurement only (`botSeats` in `human/round.ts`), not a server switch: the match
  host's fixed 32 seats would need a seat change at the match start; built only if chosen.
- **Equivalence**: with everything off, `pnpm balance --matches 30 --seed 1` gives exactly the
  night's piece 1 row (26.7 / 43.3 / 30.0 %, 8.7 swaps, 1304.2 steals, the same 39 125 steals).
- A `pickup` event per picked coin (`field.ts`) lets the round count pickups per ghost.

## Results (N = 30, seeds 1–30; full tables in docs/BALANCE.md "Human round 1")

**What happens to a coin** (bots only): median 1.2 s from spawn to pickup (p10 0.25 s, p90
5.2 s); the nearest ghost is a median 218 field units away when it appears; 776 of 17 970
coins (4.3 %) are cleared untouched at a halving.

**What a bot sees** (from the code): every coin and every ghost, every 50 ms tick, at once —
`collect` / `closestGhostByCoin` in `packages/game-core/src/bots/common.ts`, `nearestCarrier`
and `threatened` in `bots/strategies.ts`, asked by `simulate` (`src/simulation.ts`) and by the
server's `MatchHost.intents` (`apps/server/src/match-host.ts`) with the current state.

**The cause of the owner's observation, in plain sentences.** A coin is gone about a second
after it appears, and the nearest bot is usually under a second away from it; 31 bots see
every coin at once and turn to it within 50 ms. A collector that sees what the desktop
client shows and reacts in 300 ms still beats the bots at collecting (33.9 coins against
22–23 per match, rank 13.6 of 32), so the view is not the problem; but the result falls
steeply with the delay — 21.1 coins and rank 23.5 at 600 ms, 14.8 coins at 1000 ms. What a
human has between seeing a coin and the own ghost turning to it is reaction plus the
client's 100 ms render buffer, up to 100 ms until the direction is sent, and a tick, aiming
with eight-way keys or a joystick; that total, not the bots' sight, is the most likely cause.
The stand-in aims perfectly and has no input lag, so it is the better case of a human.

**Stand-in versus bots, per trial** (stand-in as a desktop player, 300 ms; bot values are the
mean per bot player and match):

| | stand-in coins | stand-in secured | stand-in rank | best bot patient / cautious / hunter | bots fair (25–42 %)? |
| --- | --- | --- | --- | --- | --- |
| today | 33.9 | 17.0 | 13.6 of 32 | 26.7 / 43.3 / 30.0 % (bots only) | at N = 300 yes (Round 6) |
| T1 bots see a desktop view | 32.2 | 17.1 | 14.4 of 32 | 26.7 / 33.3 / 40.0 % | yes |
| T2 bots react 300 ms late | 51.8 | 26.7 | 5.6 of 32 | 63.3 / 28.3 / 8.3 % | no |
| T1 + T2 | 52.3 | 28.5 | 2.5 of 32 | 71.7 / 25.0 / 3.3 % | no |
| T3 16 bots beside a human | 47.7 | 25.9 | 11.5 of 17 | 21.7 / 20.0 / 58.3 % | no |
| T1 + T2 + T3 | 56.2 | 34.6 | 7.1 of 17 | 46.7 / 36.7 / 16.7 % | no |
| T4 deadline spread 10 s | 38.0 | 18.4 | 13.3 of 32 | 20.0 / 43.3 / 36.7 % | no |

Bot values for comparison today: patient 23.0 coins / 14.4 secured, cautious 22.4 / 17.0,
hunter 2.3 / 16.0. No trial is both fair and a help, so none ran at N = 300.

**Groups at the shrines** (bots only): 28.5 per match, lasting a median 1.9 s (p90 3.3 s,
longest 6.2 s), size median 6 (largest 14); 80 % own team, 19 % securing, carried median 3.
Cause in two sentences: 63 % form 5–10 s before a deadline, because every patient and
cautious bot of a team sets off home by the same rule (time left ≤ walk + secure + 3 s) and
they arrive together to swap or secure. The groups of 8 or more (113 in 30 matches) are 54 %
hunters, which follow loaded carriers home and wait beside them while they stand still to
secure — the owner's picture of carriers with 6–7 coins in a crowd below the shrine. As T4 a
deadline spread (each bot's spare time plus up to 10 s by id) cuts the deadline groups from
464 to 258 and their median from 3.2 s to 1.1 s, but moves the bots out of the band
(patient 20 %).

**Recommendation** (from these numbers): put **no** bot trial into the game now. The two that
help a human most, T2 and T1 + T2, do it by making bots slower in general, which costs the
hunters the steal-back race and breaks the fairness won in Rounds 5–7 (hunters 8 % and 3 %);
T1 is fair but does nothing for a human; T3 leaves the human below every bot strategy; T4
helps the shrine crowds a little and costs fairness. The measurement points at the human's
own loop delay instead: next, measure it in the real client (key press or new coin on
screen → own ghost moving on screen), then decide between making the client faster (show the
own ghost from the newest state instead of 100 ms late, send the direction at once) and a
bot reaction time tuned together with the hunter, re-measured with the Round 7 check.

**Tests**: `bots/perception.test.ts` (view kept inside the field like the camera; only what
is in view, always the own ghost; the state a reaction time ago; T4 changes nothing when off
and spreads ghosts when on), `human/human.test.ts` (the stand-in goes for the nearest coin in
view, not a nearer one outside it; secures when the deadline comes near; coin lives; a shrine
group and its length; every pickup is an event). Equivalence with everything off: `pnpm
balance --matches 30 --seed 1` identical before and after T4 (the night's piece 1 row).

**Files** (lines before → after, measured against the night head `cad5994`): game-core
`bots/strategies.ts` 104 → 117, `bots/common.ts` 99 → 103, new `bots/perception.ts` 82, new
`bots/perception.test.ts` 72, `config.ts` 112 → 126, `simulation.ts` 109 → 113, `field.ts` 47 →
48, `types.ts` 85 → 87, `balance-cli.ts` 84 → 73, `fairness-cli.ts` 146 → 131, new `cli-args.ts`
31, new `human-cli.ts` 67, new `human/standin.ts` 38, new `human/round.ts` 141, new
`human/coins.ts` 35, new `human/groups.ts` 69, new `human/variants.ts` 50, new
`human/human.test.ts` 90; `package.json` root and game-core (the `human` script, one line
each); docs GAME-CORE 189 → 217, BALANCE 989 → 1105, BACKLOG 546 → (this commit); raw data `reports/human/round1-n30.json`,
`round1-groups-n30.json`, `round1-t4-n30.json`. Reused: `simulate` (a seat may bring its own
bot — no second match loop), `rotatedRoster` and `spread` from the balance, `steerTo`,
`goHomeAnd`, `deadlineNear`, `collect` unchanged, the golden-ratio `frac` of the waypoints
(now shared with T4). Removed: the two copies of the argument parser in `balance-cli.ts` and
`fairness-cli.ts` (now `cli-args.ts`).

**Noticed, left**: T3 is a parameter of the measurement only, not a server switch (the match
host's 32 fixed seats would need a seat change at each match start); the stand-in delays its
own position too, which makes it overshoot the shrine at 1000 ms; the first raw file's
groups carry no start time (the groups file has it).
