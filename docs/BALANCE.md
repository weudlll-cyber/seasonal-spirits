# Balance by simulation

`pnpm balance --matches <n> --seed <s> [--variant <name> ...]` plays n headless 32-bot
matches of the game core (seeds s … s+n−1) and sums them up
(`packages/game-core/src/balance.ts`, `balance-cli.ts`). Every match has 8 ghosts per team:
since V5 (2026-11-16) 4 bankers and 4 planners; rounds 1–7 below ran with 3 patient, 3
cautious and 2 hunters under the rules before V5 (docs/GAME-CORE.md, "Bots"). Teams rotate: in match k every
slot's team is shifted by k, so over the matches each slot plays from every corner and a
team's numbers measure its side of the field.

What the tables show, each with its N:

- **Best player of the match**: the share of matches whose best player (most secured value)
  used that strategy; ties are split.
- **Mean, median, p10, p90**: secured value per player and match (nearest-rank percentiles).
- **Matches won** per team: the share of matches the team had the most secured value.
- **Field coins gone at the halvings** (rounds 1–7): coins of the old season still on the
  field at the three halvings, per match. Since V5 no field coin goes at a halving; instead
  **coins carried across the halvings**, summed over a match's three halvings.

The bots are simple state machines; the numbers say how these three strategies do against
each other, not how people will play. No config default was changed: the owner decides.

## Configurations

Every row uses `DEFAULT_CONFIG` of `packages/game-core/src/config.ts` (5-minute match,
halving at every season change, swap 10 → 15, half value off-season, secure 2.5 s, steal
range 60, steal cooldown 1 s, field 2000, speed 300, max 60 field coins, bots: cautious banks
at 5, hunter at 8, deadline margin 3 s) with one change. Two rounds:

- **Round 1** (2026-11-14): before the hunter fix and soft separation (no separation; a
  hunter chased every carrier).
- **Round 2** (2026-11-15, `fix/ui-overlaps`): after both — hunters rob only carriers richer
  than themselves (docs/GAME-CORE.md, "Bots"), ghosts softly push each other apart
  (`separationRadius` 28, `separationStrength` 0.5).

The variants:

| Name                  | Change                       | `stealShare` | `coinSpawnPerSecond` | `carrySpeedFactor` |
| --------------------- | ---------------------------- | ------------ | -------------------- | ------------------ |
| current               | none                         | 0.5          | 2                    | 0.7                |
| stealShare=0.25       | a steal takes a quarter      | 0.25         | 2                    | 0.7                |
| stealShare=0.75       | a steal takes three quarters | 0.75         | 2                    | 0.7                |
| coinSpawnPerSecond=1  | half as many coins           | 0.5          | 1                    | 0.7                |
| coinSpawnPerSecond=3  | 1.5 times as many coins      | 0.5          | 3                    | 0.7                |
| carrySpeedFactor=0.5  | carriers much slower         | 0.5          | 2                    | 0.5                |
| carrySpeedFactor=0.85 | carriers barely slower       | 0.5          | 2                    | 0.85               |

## Round 1, stage 1 — 30 matches each (seeds 1–30), 2026-11-14

Before the hunter fix and separation. Command: `pnpm balance --matches 30 --seed 1 --variant
all`.

#### current — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 56.7 %                   | 21.8 | 2.0    | 0.5 | 83.5 | 360     |
| cautious | 0.0 %                    | 19.5 | 17.8   | 6.5 | 36.5 | 360     |
| hunter   | 43.3 %                   | 18.0 | 7.0    | 0.0 | 56.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 30.0 %               |
| Summer | 23.3 %               |
| Autumn | 30.0 %               |
| Winter | 16.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 35.1, median 35.0, p10 20.0, p90 46.0

#### stealShare=0.25 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 86.7 %                   | 24.3 | 2.3    | 0.5 | 93.5 | 360     |
| cautious | 0.0 %                    | 20.4 | 18.3   | 6.5 | 38.5 | 360     |
| hunter   | 13.3 %                   | 13.0 | 5.5    | 0.0 | 39.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 26.7 %               |
| Summer | 13.3 %               |
| Autumn | 33.3 %               |
| Winter | 26.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 35.4, median 37.5, p10 18.0, p90 47.0

#### stealShare=0.75 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 63.3 %                   | 20.8 | 2.0    | 0.5 | 76.0 | 360     |
| cautious | 0.0 %                    | 19.9 | 18.0   | 6.5 | 35.0 | 360     |
| hunter   | 36.7 %                   | 17.0 | 4.3    | 0.0 | 61.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 20.0 %               |
| Summer | 26.7 %               |
| Autumn | 36.7 %               |
| Winter | 16.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 34.9, median 35.0, p10 21.0, p90 51.0

#### coinSpawnPerSecond=1 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 70.0 %                   | 7.3  | 1.0    | 0.5 | 23.5 | 360     |
| cautious | 10.0 %                   | 12.0 | 10.0   | 5.0 | 21.5 | 360     |
| hunter   | 20.0 %                   | 5.3  | 1.3    | 0.0 | 12.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 23.3 %               |
| Summer | 33.3 %               |
| Autumn | 13.3 %               |
| Winter | 30.0 %               |

Field coins gone at the halvings, per match (N = 30): mean 11.5, median 11.5, p10 6.0, p90 17.0

#### coinSpawnPerSecond=3 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90   | Players |
| -------- | ------------------------ | ---- | ------ | --- | ----- | ------- |
| patient  | 73.3 %                   | 34.5 | 6.0    | 0.5 | 116.0 | 360     |
| cautious | 0.0 %                    | 26.3 | 24.0   | 8.5 | 48.0  | 360     |
| hunter   | 26.7 %                   | 35.0 | 10.3   | 0.0 | 117.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 33.3 %               |
| Summer | 23.3 %               |
| Autumn | 23.3 %               |
| Winter | 20.0 %               |

Field coins gone at the halvings, per match (N = 30): mean 60.4, median 60.5, p10 41.0, p90 77.0

#### carrySpeedFactor=0.5 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 66.7 %                   | 16.0 | 2.5    | 0.5 | 58.0 | 360     |
| cautious | 0.0 %                    | 20.7 | 20.0   | 8.0 | 34.0 | 360     |
| hunter   | 33.3 %                   | 17.3 | 8.0    | 0.0 | 59.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 33.3 %               |
| Summer | 26.7 %               |
| Autumn | 23.3 %               |
| Winter | 16.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 38.5, median 36.0, p10 19.0, p90 56.0

#### carrySpeedFactor=0.85 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 70.0 %                   | 25.5 | 1.5    | 0.5 | 84.5 | 360     |
| cautious | 0.0 %                    | 18.7 | 16.0   | 6.0 | 35.5 | 360     |
| hunter   | 30.0 %                   | 19.2 | 4.8    | 0.0 | 61.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 26.7 %               |
| Summer | 23.3 %               |
| Autumn | 23.3 %               |
| Winter | 26.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 31.0, median 31.0, p10 14.0, p90 48.0

### Round 1: which variants go to stage 2

Distance of a variant from the current config: the sum of the absolute differences of the
three "best player of the match" shares (N = 30 each).

| Variant               | patient | cautious | hunter | Distance    |
| --------------------- | ------- | -------- | ------ | ----------- |
| stealShare=0.25       | 86.7 %  | 0.0 %    | 13.3 % | 60.0 points |
| coinSpawnPerSecond=1  | 70.0 %  | 10.0 %   | 20.0 % | 46.7 points |
| coinSpawnPerSecond=3  | 73.3 %  | 0.0 %    | 26.7 % | 33.3 points |
| carrySpeedFactor=0.85 | 70.0 %  | 0.0 %    | 30.0 % | 26.7 points |
| carrySpeedFactor=0.5  | 66.7 %  | 0.0 %    | 33.3 % | 20.0 points |
| stealShare=0.75       | 63.3 %  | 0.0 %    | 36.7 % | 13.3 points |

(current: patient 56.7 %, cautious 0.0 %, hunter 43.3 %.) Stage 2 runs the current config,
`stealShare=0.25` and `coinSpawnPerSecond=1`.

## Round 1, stage 2 — 300 matches each (seeds 1–300), 2026-11-14

Command: `pnpm balance --matches 300 --seed 1 --variant current --variant stealShare=0.25
--variant coinSpawnPerSecond=1`.

#### current — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 66.5 %                   | 21.3 | 2.0    | 0.5 | 73.5 | 3600    |
| cautious | 0.0 %                    | 19.4 | 17.5   | 6.0 | 35.5 | 3600    |
| hunter   | 33.5 %                   | 19.6 | 7.0    | 0.0 | 65.5 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 24.3 %                |
| Summer | 25.5 %                |
| Autumn | 24.7 %                |
| Winter | 25.5 %                |

Field coins gone at the halvings, per match (N = 300): mean 32.6, median 31.0, p10 19.0, p90 50.0

#### stealShare=0.25 — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 88.0 %                   | 25.2 | 2.5    | 0.5 | 92.0 | 3600    |
| cautious | 0.0 %                    | 20.0 | 18.0   | 6.5 | 36.5 | 3600    |
| hunter   | 12.0 %                   | 13.1 | 5.0    | 0.0 | 42.0 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 22.8 %                |
| Summer | 22.3 %                |
| Autumn | 25.5 %                |
| Winter | 29.3 %                |

Field coins gone at the halvings, per match (N = 300): mean 32.6, median 31.0, p10 19.0, p90 48.0

#### coinSpawnPerSecond=1 — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 74.8 %                   | 7.7  | 1.0    | 0.5 | 23.5 | 3600    |
| cautious | 6.5 %                    | 12.1 | 10.5   | 5.0 | 21.5 | 3600    |
| hunter   | 18.7 %                   | 4.7  | 1.0    | 0.0 | 11.0 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 27.3 %                |
| Summer | 25.0 %                |
| Autumn | 22.3 %                |
| Winter | 25.3 %                |

Field coins gone at the halvings, per match (N = 300): mean 10.9, median 10.0, p10 6.0, p90 17.0

## Round 1: what the numbers said (before the hunter fix and separation)

- **Patient dominates the top, cautious the middle.** With the current config (N = 300) the
  best player of a match is patient in 66.5 %, hunter in 33.5 %, cautious never. But the
  patient median is 2.0 (p10 0.5, p90 73.5): most patient bots end with almost nothing and a
  few win big; cautious is steady (median 17.5, p10 6.0, p90 35.5). The swap chain pays only
  for the patient bot that is never robbed.
- **Teams are fair.** 24.3 % to 25.5 % per team with the current config (N = 300; an even
  split is 25 %). The two variants stay between 22.3 % and 29.3 %.
- **stealShare changes most at the top.** At 0.25 the hunters' share of best players falls
  from 33.5 % to 12.0 % and patient rises to 88.0 % (N = 300 each); at 0.75 (stage 1, N = 30)
  they move by about 7 points (patient 63.3 %, hunter 36.7 %).
- **coinSpawnPerSecond = 1 makes the whole match poor.** All means drop to about a third
  (patient 7.7, cautious 12.1, hunter 4.7; N = 300) and cautious becomes the best player in
  6.5 % of matches; with 3 coins per second (stage 1, N = 30) the means rise by a third (cautious) to almost
  double (hunter).
- **The unchanged spawn rate across halvings** (CONCEPT.md §13, point 2): with 2 coins per
  second about 33 field coins disappear at the three halvings per match (N = 300; p10 19,
  p90 50), against about 600 spawned per match (`pnpm simulate --seed 1`: 599); the
  halving is a deadline for carried coins, not a loss of field coins.
- **Carry speed** (stage 1, N = 30) moves the shares by 10–13 points either way; not run at 300.

Nothing here changes a default; the owner decides.

## Round 2, stage 1 — 30 matches each (seeds 1–30), 2026-11-15

After the hunter fix and separation (config above). Command: `pnpm balance --matches 30
--seed 1 --variant all`.

#### current — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 3.6  | 2.8    | 1.0  | 7.5  | 360     |
| cautious | 26.7 %                   | 21.3 | 21.0   | 12.0 | 32.0 | 360     |
| hunter   | 73.3 %                   | 21.9 | 19.5   | 10.5 | 38.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 30.0 %               |
| Summer | 23.3 %               |
| Autumn | 23.3 %               |
| Winter | 23.3 %               |

Field coins gone at the halvings, per match (N = 30): mean 13.8, median 13.0, p10 8.0, p90 21.0

To tell the two changes apart, the same 30 matches ran once with the hunter fix but
`separationStrength` 0 (a one-off scratch run through `runBalance` on 2026-11-15, not a
variant of the command): best player patient 26.7 %, cautious 3.3 %, hunter 70.0 %; mean
secured value patient 6.5 (median 1.0), cautious 18.4 (17.0), hunter 27.7 (24.0); field coins
gone at the halvings 28.9 per match. The hunter fix moves most; separation adds a little.

#### current after the pack fix (2026-11-15, `fix/dots-and-packs`) — N = 30, seeds 1–30

Same command and seeds. Changed in the bots only: a collector goes for the nearest coin no
other ghost is closer to, else patrols its own waypoint (`bots.waypointMs` 4000, placeholder;
docs/GAME-CORE.md, "Bots"); before, neighbours shared one target coin and moved as packs.

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 3.0  | 2.0    | 0.0  | 7.0  | 360     |
| cautious | 6.7 %                    | 17.7 | 17.8   | 11.0 | 24.0 | 360     |
| hunter   | 93.3 %                   | 25.5 | 23.0   | 12.0 | 40.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 26.7 %               |
| Summer | 16.7 %               |
| Autumn | 33.3 %               |
| Winter | 23.3 %               |

Field coins gone at the halvings, per match (N = 30): mean 12.9, median 13.0, p10 7.0, p90 19.0

Spread-out collectors are easier prey: hunters rise from 73.3 % to 93.3 % best player; the
fairness search (session 2026-11-15-CD, part 5) starts from here.

#### current after the pickup fix and the patient bot's fixes (2026-11-15, `feat/fairness`) — N = 30, seeds 1–30

Same command and seeds, on top of the row above: pickup when the drawn shapes touch
(`ghostRadius` 14 + growth, `coinRadius` 10 instead of `pickupRadius` 30), and the patient
bot banks before a halving it cannot swap for and goes home with a load when an opponent
comes within `bots.threatRange` (150; docs/GAME-CORE.md, "Bots").

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 10.0 %                   | 13.7 | 13.5   | 9.0  | 19.5 | 360     |
| cautious | 41.7 %                   | 16.9 | 16.0   | 10.0 | 24.5 | 360     |
| hunter   | 48.3 %                   | 17.2 | 16.0   | 8.5  | 27.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 30.0 %               |
| Summer | 16.7 %               |
| Autumn | 30.0 %               |
| Winter | 23.3 %               |

Field coins gone at the halvings, per match (N = 30): mean 20.8, median 20.0, p10 15.0, p90 26.0

The fairness search below starts from this configuration.

#### stealShare=0.25 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 4.2  | 3.0    | 1.0  | 8.5  | 360     |
| cautious | 58.3 %                   | 22.2 | 21.5   | 13.0 | 33.0 | 360     |
| hunter   | 41.7 %                   | 19.2 | 18.0   | 8.5  | 32.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 23.3 %               |
| Summer | 23.3 %               |
| Autumn | 26.7 %               |
| Winter | 26.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 13.1, median 13.0, p10 8.0, p90 17.0

#### stealShare=0.75 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 4.3  | 3.0    | 1.0  | 8.5  | 360     |
| cautious | 10.0 %                   | 20.0 | 19.0   | 10.0 | 31.0 | 360     |
| hunter   | 90.0 %                   | 22.8 | 20.8   | 1.0  | 47.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 16.7 %               |
| Summer | 26.7 %               |
| Autumn | 26.7 %               |
| Winter | 30.0 %               |

Field coins gone at the halvings, per match (N = 30): mean 11.8, median 12.0, p10 8.0, p90 14.0

#### coinSpawnPerSecond=1 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 0.0 %                    | 1.9  | 1.5    | 0.5 | 4.0  | 360     |
| cautious | 54.4 %                   | 10.5 | 9.5    | 5.5 | 16.5 | 360     |
| hunter   | 45.6 %                   | 9.2  | 9.0    | 2.0 | 17.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 20.0 %               |
| Summer | 38.3 %               |
| Autumn | 20.0 %               |
| Winter | 21.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 4.3, median 4.0, p10 2.0, p90 6.0

#### coinSpawnPerSecond=3 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 5.4  | 4.0    | 1.0  | 11.5 | 360     |
| cautious | 10.0 %                   | 31.9 | 32.0   | 18.5 | 46.0 | 360     |
| hunter   | 90.0 %                   | 37.2 | 33.5   | 14.0 | 62.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 30.0 %               |
| Summer | 23.3 %               |
| Autumn | 16.7 %               |
| Winter | 30.0 %               |

Field coins gone at the halvings, per match (N = 30): mean 23.3, median 22.5, p10 15.0, p90 33.0

#### carrySpeedFactor=0.5 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 3.7  | 3.0    | 1.0  | 7.5  | 360     |
| cautious | 45.0 %                   | 21.2 | 20.5   | 12.0 | 31.0 | 360     |
| hunter   | 55.0 %                   | 19.9 | 18.3   | 7.5  | 34.0 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 6.7 %                |
| Summer | 25.0 %               |
| Autumn | 46.7 %               |
| Winter | 21.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 18.9, median 18.5, p10 12.0, p90 27.0

#### carrySpeedFactor=0.85 — N = 30 matches, seeds 1–30

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 3.5  | 2.5    | 0.5  | 7.0  | 360     |
| cautious | 33.3 %                   | 21.3 | 20.0   | 11.0 | 34.0 | 360     |
| hunter   | 66.7 %                   | 22.7 | 20.5   | 9.5  | 38.5 | 240     |

| Team   | Matches won (N = 30) |
| ------ | -------------------- |
| Spring | 23.3 %               |
| Summer | 20.0 %               |
| Autumn | 30.0 %               |
| Winter | 26.7 %               |

Field coins gone at the halvings, per match (N = 30): mean 10.6, median 10.5, p10 7.0, p90 14.0

### Round 2: which variants go to stage 2

Same rule as round 1: the sum of the absolute differences of the three "best player of the
match" shares from the current config (patient 0.0 %, cautious 26.7 %, hunter 73.3 %;
N = 30 each).

| Variant               | patient | cautious | hunter | Distance    |
| --------------------- | ------- | -------- | ------ | ----------- |
| stealShare=0.25       | 0.0 %   | 58.3 %   | 41.7 % | 63.3 points |
| coinSpawnPerSecond=1  | 0.0 %   | 54.4 %   | 45.6 % | 55.6 points |
| carrySpeedFactor=0.5  | 0.0 %   | 45.0 %   | 55.0 % | 36.7 points |
| stealShare=0.75       | 0.0 %   | 10.0 %   | 90.0 % | 33.3 points |
| coinSpawnPerSecond=3  | 0.0 %   | 10.0 %   | 90.0 % | 33.3 points |
| carrySpeedFactor=0.85 | 0.0 %   | 33.3 %   | 66.7 % | 13.3 points |

Stage 2 runs the current config, `stealShare=0.25` and `coinSpawnPerSecond=1` — the same
two as in round 1.

## Round 2, stage 2 — 300 matches each (seeds 1–300), 2026-11-15

Command: `pnpm balance --matches 300 --seed 1 --variant current --variant stealShare=0.25
--variant coinSpawnPerSecond=1`.

#### current — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 1.7 %                    | 3.8  | 3.0    | 1.0  | 7.5  | 3600    |
| cautious | 32.3 %                   | 21.5 | 21.0   | 12.0 | 31.5 | 3600    |
| hunter   | 66.0 %                   | 21.3 | 19.5   | 8.0  | 37.0 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 29.8 %                |
| Summer | 22.7 %                |
| Autumn | 25.2 %                |
| Winter | 22.3 %                |

Field coins gone at the halvings, per match (N = 300): mean 12.8, median 12.0, p10 8.0, p90 18.0

#### stealShare=0.25 — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10  | p90  | Players |
| -------- | ------------------------ | ---- | ------ | ---- | ---- | ------- |
| patient  | 0.0 %                    | 4.1  | 3.0    | 1.0  | 8.0  | 3600    |
| cautious | 70.0 %                   | 22.8 | 22.0   | 13.0 | 33.5 | 3600    |
| hunter   | 30.0 %                   | 18.4 | 17.5   | 8.0  | 30.0 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 24.3 %                |
| Summer | 25.5 %                |
| Autumn | 25.8 %                |
| Winter | 24.3 %                |

Field coins gone at the halvings, per match (N = 300): mean 12.5, median 12.0, p10 8.0, p90 18.0

#### coinSpawnPerSecond=1 — N = 300 matches, seeds 1–300

| Strategy | Best player of the match | Mean | Median | p10 | p90  | Players |
| -------- | ------------------------ | ---- | ------ | --- | ---- | ------- |
| patient  | 0.3 %                    | 1.8  | 1.5    | 0.5 | 3.5  | 3600    |
| cautious | 55.6 %                   | 10.7 | 10.0   | 6.0 | 17.0 | 3600    |
| hunter   | 44.1 %                   | 9.4  | 9.0    | 2.0 | 17.0 | 2400    |

| Team   | Matches won (N = 300) |
| ------ | --------------------- |
| Spring | 23.0 %                |
| Summer | 27.2 %                |
| Autumn | 27.3 %                |
| Winter | 22.5 %                |

Field coins gone at the halvings, per match (N = 300): mean 4.2, median 4.0, p10 2.0, p90 7.0

## Round 2: what the numbers say (after the hunter fix and separation)

- **Patient has collapsed in every configuration.** Best player at most 1.7 % (current,
  N = 300), mean secured value 1.8 to 5.4 in every row (round 1: 21.3 at N = 300). The
  patient bot carries its coins the longest (it holds 10 for a swap), and the hunters,
  who no longer rob each other, now find it. No variant tried here brings it back; that
  takes a change to the bots or to a rule, and is the owner's decision.
- **Current config: hunter on top, cautious close behind.** Best player hunter 66.0 %,
  cautious 32.3 %, patient 1.7 % (N = 300); the means of cautious (21.5) and hunter (21.3)
  are almost equal — the hunter wins more matches with a wider spread (p10 8.0, p90 37.0
  against 12.0 / 31.5).
- **Which strategy dominates under each variant:** hunter under the current config (66.0 %,
  N = 300), `stealShare=0.75` (90.0 %, N = 30), `coinSpawnPerSecond=3` (90.0 %, N = 30),
  `carrySpeedFactor=0.85` (66.7 %, N = 30) and narrowly `carrySpeedFactor=0.5` (55.0 %,
  N = 30); cautious under `stealShare=0.25` (70.0 %, N = 300) and `coinSpawnPerSecond=1`
  (55.6 %, N = 300).
- **Closest together:** measured as the sum of the distances of the three best-player shares
  from an even split (33.3 % each), the current config is closest (65.3 points, N = 300),
  with `coinSpawnPerSecond=1` (66.2, N = 300) and both carry-speed variants (66.7 each,
  N = 30) next to it; `stealShare=0.25` 73.3 (N = 300), `stealShare=0.75` and
  `coinSpawnPerSecond=3` 113.3 (N = 30). Because patient is near 0 % everywhere, every
  variant is about 65 points or more from even; between cautious and hunter alone the most
  even are `carrySpeedFactor=0.5` (45.0 / 55.0, N = 30) and `coinSpawnPerSecond=1`
  (55.6 / 44.1, N = 300).
- **stealShare is still the strongest lever between hunter and cautious:** 0.25 turns the
  top from hunter (66.0 %) to cautious (70.0 %), N = 300 each.
- **Teams stay fair:** 22.3 % to 29.8 % per team (N = 300, all three rows).
- **Fewer field coins lost at the halvings:** 12.8 per match with the current config
  (N = 300; round 1: 32.6) — the bots now spread out and pick the field cleaner.

Nothing here changes a default; the owner decides (BACKLOG d).

## Round 3 — the fairness search (2026-11-15, `feat/fairness`)

Owner decision 2026-11-15: each strategy's best player wins between 25 % and 42 % of the
matches; if no setting reaches that, the rule goes back to the owner.

**Base config of every row**: `DEFAULT_CONFIG` of `packages/game-core/src/config.ts` on
`feat/fairness` — 5-minute match, halving at every season change, swap 10 → 15 (except the
comparison below), half value off-season, steal range 60, field 2000, speed 300, max 60
field coins, separation 28 / 0.5, ghost radius 14 (+0.5 per coin, at most +16), coin radius
10, bots: cautious banks at 5, hunter at 8, deadline margin 3 s, waypoint 4 s, threat range
150 — with the five values each row names. Bots: 3 patient, 3 cautious, 2 hunters per team,
teams rotating (as above). Tool: `pnpm fairness` (`src/fairness-cli.ts`, `src/fairness.ts`);
every report in full in `reports/fairness/*.json`.

Measure: **distance** = sum of the distances of the three "best player of the match" shares
from 33.3 %, in points (0 = even).

### Stage 1 — 288 configurations × 30 matches (seeds 1–30)

Grid: `stealShare` {0.15, 0.25, 0.35, 0.5} × `coinSpawnPerSecond` {1, 1.5, 2, 3} ×
`carrySpeedFactor` {0.5, 0.7, 0.85} × `stealCooldownMs` {1000, 2000, 3000} ×
`secureDurationMs` {2000, 3000}. Command: `pnpm fairness --grid --matches 30 --seed 1 --jobs
8 --out reports/fairness/stage1-grid.json` (not in the repository since 2026-11-16, see
"Raw data"; 26 min 20 s, 8 processes on 14 cores; one
configuration alone 19.8 s with 48 % CPU load from a running `pnpm dev`; the whole grid was
under 3 hours, so no dimension was dropped).

**7 of 288 have all three strategies within 25–42 % (N = 30 each)** — all with 1 coin per
second. The 20 closest to even (all 288 in the JSON file):

| stealShare | spawn/s | carry | cooldown ms | secure ms | patient | cautious | hunter | distance |
| ---------- | ------- | ----- | ----------- | --------- | ------- | -------- | ------ | -------- |
| 0.25       | 1       | 0.5   | 2000        | 3000      | 36.7 %  | 31.7 %   | 31.7 % | 6.7      |
| 0.15       | 1       | 0.85  | 3000        | 3000      | 38.3 %  | 31.7 %   | 30.0 % | 10.0     |
| 0.25       | 1       | 0.7   | 2000        | 3000      | 38.3 %  | 31.7 %   | 30.0 % | 10.0     |
| 0.15       | 1       | 0.7   | 2000        | 2000      | 27.8 %  | 38.3 %   | 33.9 % | 11.1     |
| 0.35       | 1       | 0.5   | 3000        | 3000      | 26.7 %  | 38.3 %   | 35.0 % | 13.3     |
| 0.25       | 1       | 0.5   | 1000        | 2000      | 28.3 %  | 41.7 %   | 30.0 % | 16.7     |
| 0.5        | 1       | 0.5   | 2000        | 3000      | 26.7 %  | 41.7 %   | 31.7 % | 16.7     |
| 0.5        | 1.5     | 0.5   | 2000        | 2000      | 23.3 %  | 33.3 %   | 43.3 % | 20.0     |
| 0.25       | 1       | 0.85  | 2000        | 3000      | 23.3 %  | 38.3 %   | 38.3 % | 20.0     |
| 0.5        | 3       | 0.5   | 1000        | 2000      | 23.3 %  | 38.3 %   | 38.3 % | 20.0     |
| 0.25       | 1       | 0.85  | 1000        | 2000      | 28.3 %  | 45.0 %   | 26.7 % | 23.3     |
| 0.5        | 3       | 0.5   | 3000        | 3000      | 21.7 %  | 39.4 %   | 38.9 % | 23.3     |
| 0.15       | 1       | 0.7   | 1000        | 2000      | 20.7 %  | 41.0 %   | 38.3 % | 25.3     |
| 0.25       | 1       | 0.7   | 1000        | 2000      | 21.1 %  | 46.1 %   | 32.8 % | 25.6     |
| 0.35       | 1.5     | 0.5   | 1000        | 3000      | 26.7 %  | 46.7 %   | 26.7 % | 26.7     |
| 0.35       | 1.5     | 0.5   | 2000        | 2000      | 20.0 %  | 37.2 %   | 42.8 % | 26.7     |
| 0.5        | 2       | 0.5   | 1000        | 3000      | 20.0 %  | 33.3 %   | 46.7 % | 26.7     |
| 0.5        | 3       | 0.5   | 1000        | 3000      | 20.0 %  | 33.3 %   | 46.7 % | 26.7     |
| 0.25       | 1       | 0.85  | 2000        | 2000      | 20.0 %  | 41.7 %   | 38.3 % | 26.7     |
| 0.5        | 1       | 0.5   | 3000        | 3000      | 20.0 %  | 40.0 %   | 40.0 % | 26.7     |

The current default (0.5 / 2 / 0.7 / 1000 / 2500) is not in the grid (secure 2500 ms); its own
N = 30 row above: 10.0 % / 41.7 % / 48.3 %, distance 46.7.

### Stage 2 — the 7 qualifying configurations × 300 matches (seeds 1–300)

Command: `pnpm fairness --configs <the 7> --matches 300 --seed 1 --jobs 7 --out
reports/fairness/stage2.json` (6 min 7 s; CPU load 15 % before the start). Best player share
and secured value per player and match (mean / median / p10 / p90), N = 300 matches each
(3600 patient, 3600 cautious, 2400 hunter players):

| stealShare | spawn/s | carry | cooldown ms | secure ms | patient    | cautious   | hunter     | distance | patient secured        | cautious secured       | hunter secured         | teams won   |
| ---------- | ------- | ----- | ----------- | --------- | ---------- | ---------- | ---------- | -------- | ---------------------- | ---------------------- | ---------------------- | ----------- |
| 0.25       | 1       | 0.7   | 2000        | 3000      | 25.1 %     | **44.0 %** | 30.9 %     | 21.3     | 7.8 / 7.5 / 5.0 / 11.0 | 8.0 / 8.0 / 4.5 / 12.0 | 7.5 / 7.5 / 2.5 / 12.0 | 22.8–27.7 % |
| 0.35       | 1       | 0.5   | 3000        | 3000      | **19.5 %** | 38.7 %     | 41.8 %     | 27.7     | 7.2 / 7.0 / 4.0 / 11.0 | 7.7 / 7.0 / 4.0 / 12.0 | 7.5 / 7.5 / 1.5 / 13.0 | 20.8–27.5 % |
| 0.15       | 1       | 0.7   | 2000        | 2000      | **23.9 %** | **47.9 %** | 28.2 %     | 29.2     | 7.9 / 8.0 / 5.0 / 11.5 | 8.3 / 8.0 / 5.0 / 12.5 | 7.3 / 7.5 / 2.0 / 12.0 | 21.3–28.5 % |
| 0.25       | 1       | 0.5   | 1000        | 2000      | 26.2 %     | **49.3 %** | **24.5 %** | 32.0     | 7.7 / 7.5 / 4.5 / 11.0 | 8.0 / 7.5 / 4.5 / 12.0 | 7.3 / 7.5 / 2.5 / 12.0 | 21.5–28.8 % |
| 0.15       | 1       | 0.85  | 3000        | 3000      | **22.9 %** | **49.5 %** | 27.6 %     | 32.3     | 7.9 / 8.0 / 4.5 / 11.5 | 8.3 / 8.0 / 5.0 / 12.0 | 7.4 / 7.5 / 2.5 / 12.0 | 21.2–30.3 % |
| 0.25       | 1       | 0.5   | 2000        | 3000      | 28.2 %     | **52.0 %** | **19.8 %** | 37.3     | 7.6 / 7.0 / 4.5 / 11.0 | 7.9 / 7.5 / 4.5 / 12.0 | 7.1 / 7.0 / 3.0 / 11.0 | 20.3–34.0 % |
| 0.5        | 1       | 0.5   | 2000        | 3000      | **13.6 %** | 40.9 %     | **45.5 %** | 39.4     | 7.2 / 7.0 / 4.0 / 11.0 | 7.6 / 7.0 / 4.0 / 12.0 | 7.6 / 7.5 / 2.0 / 13.0 | 21.8–28.2 % |

Bold: outside 25–42 %. **None of the 7 holds the band at N = 300.** The closest — stealShare
0.25, 1 coin/s, carry 0.7, cooldown 2000 ms, secure 3000 ms — misses by 2 points (cautious
44.0 %). At N = 30 a share moves by several points from seed to seed; the stage-1 passes
were partly luck.

### Comparison only — swap 10 → 18 and 10 → 12 (rule change, owner decides)

CONCEPT.md §10 decision 2 (swap 10 → 15) is not to be changed; this only shows what it would
do. The best stage-2 configuration with `swapOut` 18 and 12, N = 30 (seeds 1–30) each:

| swapOut | patient | cautious | hunter | distance |
| ------- | ------- | -------- | ------ | -------- |
| 18      | 38.3 %  | 31.7 %   | 30.0 % | 10.0     |
| 12      | 38.3 %  | 31.7 %   | 30.0 % | 10.0     |

Both equal the same configuration with swap 10 → 15 at N = 30 (stage 1: 38.3 % / 31.7 % /
30.0 %): at one coin per second no bot ever holds 10 coins of one season, so the swap never
happens and its rate changes nothing. The swap only matters with more coins on the field.

### Round 3: what the numbers say

- **No configuration of the grid reaches 25–42 % for all three strategies at N = 300.** The
  closest misses by 2 points (cautious 44.0 %). By the owner's rule, the question goes back
  to the owner.
- **Only one coin per second comes close.** All 7 stage-1 passes and the whole stage-2 field
  have `coinSpawnPerSecond` 1. Averaged over the 72 grid configurations of each rate (N = 30
  each), the best-player shares are patient / cautious / hunter 14.6 / 38.4 / 47.1 % at 1
  coin per second, 13.9 / 52.7 / 33.4 % at 1.5, 12.8 / 58.6 / 28.6 % at 2 and 16.5 / 56.3 /
  27.2 % at 3: with more coins the cautious bot runs away with it, at one coin the hunters
  lead, and the patient bot stays at 13–17 % everywhere.
- **Where it comes close, everyone is poor.** At 1 coin per second the secured value per
  player and match is about 7–8 for every strategy (median 7.0–8.0); the strategies differ
  mostly in the spread (hunter p10 1.5–3.0, cautious and patient 4.0–5.0). Teams stay fair
  (20–34 % per team).
- **Cautious is the lever's other end**: whatever makes hunters weaker (lower stealShare,
  longer cooldown) hands the share to the cautious bot, not to the patient one.
- **The swap rate does not help here**: at one coin per second no bot swaps (comparison
  above).

Nothing here changes a default; the owner decides (BACKLOG d).

## Round 4 — rule trials (2026-11-15, `feat/rule-trials`)

Owner decision 2026-11-15: no value setting met the target (Round 3), and at 1 coin per
second no swap happens; three rule changes are measured, alone and combined. Trials only:
built behind config switches whose defaults are today's game (docs/GAME-CORE.md, "Rule
trials").

- **R1 `swapMode` `'ratio'`**: a swap from `swapMinIn` = 6 coins of the current season at the
  same rate, rounded down (6 → 9, 8 → 12, 10 → 15); not in the last season.
- **R2 `swappedStealProof`**: coins got from a swap cannot be stolen until the next halving.
- **R3 `escortRadius`** 50 or 90: a carrier with a teammate within that radius cannot be
  robbed. **Measured without bots that seek escorts**: the bots follow the rule (hunters skip
  escorted carriers) but nobody walks beside a teammate on purpose.

**Base config of every row**: `DEFAULT_CONFIG` on `feat/rule-trials` — the same as the last
default row of Round 3 (stealShare 0.5, carry 0.7, steal cooldown 1000 ms, secure 2500 ms,
swap 10 → 15 with `'fixed'`, steal range 60, separation 28 / 0.5, ghost radius 14, coin
radius 10, bots: cautious 5, hunter 8, deadline margin 3 s, waypoint 4 s, threat range 150)
with the four values each row names. 32 bots, teams rotating. The defaults check: with all
switches at their defaults `pnpm balance --matches 30 --seed 1` gives exactly the last default
N = 30 row (10.0 / 41.7 / 48.3 %). Raw reports: `reports/rule-trials/stage1.json`,
`stage2.json`. Swaps per match: all swaps by all 32 bots in one match.

### Stage 1 — 24 configurations × 30 matches (seeds 1–30)

Grid: `swapMode` {fixed, ratio} × `swappedStealProof` {false, true} × `escortRadius` {0, 50,
90} × `coinSpawnPerSecond` {1.5, 2}. Command: `pnpm fairness --rules-grid --matches 30 --seed
1 --jobs 8 --out reports/rule-trials/stage1.json` (3 min 1 s, 8 processes on 14 cores; CPU
load 29 % before the start, the running `pnpm dev`). Best player share per strategy (bold:
all three within 25–42 %), secured value per player and match, team wins, swaps. Sorted by
distance from an even split; N = 30 matches each (360 patient, 360 cautious, 240 hunter
players).

| swapMode | swappedStealProof | escortRadius | spawn/s | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured     | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) |
| -------- | ----------------- | ------------ | ------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ------------------ | ----------------------------- | ------------------------------- |
| ratio    | true              | 0            | 2       | **26.7 %** | **31.7 %** | **41.7 %** | 16.7     | 13.0 / 8.0 / 21.5                    | 16.0 / 10.0 / 25.0 | 17.0 / 6.0 / 28.5  | 20.0 / 26.7 / 20.0 / 33.3 %   | 10.1 / 10.0                     |
| fixed    | true              | 0            | 1.5     | 13.3 %     | 31.7 %     | 55.0 %     | 43.3     | 10.5 / 7.0 / 16.0                    | 12.0 / 6.0 / 17.0  | 12.0 / 5.0 / 20.0  | 16.7 / 43.3 / 23.3 / 16.7 %   | 0.3 / 0.0                       |
| fixed    | false             | 0            | 2       | 10.0 %     | 41.7 %     | 48.3 %     | 46.7     | 13.5 / 9.0 / 19.5                    | 16.0 / 10.0 / 24.5 | 16.0 / 8.5 / 27.5  | 30.0 / 16.7 / 30.0 / 23.3 %   | 1.3 / 1.0                       |
| ratio    | true              | 0            | 1.5     | 16.7 %     | 23.3 %     | 60.0 %     | 53.3     | 10.0 / 6.0 / 16.0                    | 11.5 / 7.0 / 17.5  | 12.5 / 5.5 / 22.5  | 26.7 / 11.7 / 36.7 / 25.0 %   | 3.8 / 4.0                       |
| fixed    | false             | 0            | 1.5     | 6.7 %      | 31.7 %     | 61.7 %     | 56.7     | 10.5 / 7.0 / 16.0                    | 12.0 / 6.5 / 17.0  | 12.0 / 5.0 / 20.0  | 20.0 / 40.0 / 23.3 / 16.7 %   | 0.3 / 0.0                       |
| ratio    | false             | 0            | 1.5     | 15.0 %     | 21.7 %     | 63.3 %     | 60.0     | 10.0 / 6.0 / 15.0                    | 12.0 / 7.0 / 18.0  | 13.0 / 5.5 / 22.5  | 28.3 / 11.7 / 33.3 / 26.7 %   | 4.1 / 4.0                       |
| fixed    | true              | 0            | 2       | 10.0 %     | 66.7 %     | 23.3 %     | 66.7     | 13.5 / 9.0 / 19.5                    | 16.5 / 10.0 / 25.0 | 15.8 / 7.5 / 25.5  | 33.3 / 13.3 / 23.3 / 30.0 %   | 1.1 / 1.0                       |
| ratio    | false             | 0            | 2       | 10.0 %     | 10.0 %     | 80.0 %     | 93.3     | 12.0 / 7.0 / 19.0                    | 16.0 / 10.0 / 24.5 | 19.0 / 9.0 / 33.5  | 30.0 / 10.0 / 26.7 / 33.3 %   | 9.5 / 9.0                       |
| ratio    | true              | 50           | 2       | 13.3 %     | 3.3 %      | 83.3 %     | 100.0    | 12.0 / 7.5 / 19.5                    | 15.0 / 9.0 / 22.0  | 20.5 / 10.5 / 34.0 | 23.3 / 26.7 / 30.0 / 20.0 %   | 6.0 / 6.0                       |
| fixed    | false             | 50           | 1.5     | 0.0 %      | 13.3 %     | 86.7 %     | 106.7    | 9.5 / 6.0 / 14.0                     | 10.8 / 6.0 / 16.0  | 16.0 / 8.0 / 24.5  | 10.0 / 33.3 / 23.3 / 33.3 %   | 0.1 / 0.0                       |
| ratio    | false             | 50           | 2       | 3.3 %      | 8.3 %      | 88.3 %     | 110.0    | 11.0 / 7.0 / 17.0                    | 15.0 / 8.5 / 23.0  | 23.5 / 13.0 / 36.0 | 16.7 / 40.0 / 30.0 / 13.3 %   | 5.6 / 5.0                       |
| fixed    | true              | 50           | 1.5     | 0.0 %      | 10.0 %     | 90.0 %     | 113.3    | 9.5 / 6.0 / 14.0                     | 10.5 / 6.0 / 16.0  | 16.0 / 8.0 / 24.0  | 13.3 / 30.0 / 26.7 / 30.0 %   | 0.1 / 0.0                       |
| fixed    | true              | 50           | 2       | 0.0 %      | 6.7 %      | 93.3 %     | 120.0    | 12.0 / 8.0 / 19.0                    | 15.0 / 8.0 / 22.5  | 20.0 / 11.0 / 33.0 | 33.3 / 10.0 / 18.3 / 38.3 %   | 0.8 / 0.5                       |
| ratio    | true              | 90           | 1.5     | 3.3 %      | 3.3 %      | 93.3 %     | 120.0    | 8.0 / 5.0 / 13.0                     | 10.0 / 6.0 / 15.0  | 18.3 / 9.5 / 28.0  | 20.0 / 26.7 / 40.0 / 13.3 %   | 1.8 / 2.0                       |
| fixed    | false             | 50           | 2       | 0.0 %      | 5.0 %      | 95.0 %     | 123.3    | 12.0 / 7.5 / 18.0                    | 15.5 / 9.0 / 23.0  | 20.0 / 11.0 / 33.0 | 36.7 / 18.3 / 18.3 / 26.7 %   | 0.8 / 0.5                       |
| ratio    | false             | 90           | 1.5     | 0.0 %      | 5.0 %      | 95.0 %     | 123.3    | 8.0 / 5.0 / 12.0                     | 10.0 / 5.5 / 15.5  | 18.0 / 9.5 / 28.5  | 18.3 / 30.0 / 28.3 / 23.3 %   | 1.8 / 2.0                       |
| fixed    | false             | 90           | 1.5     | 0.0 %      | 3.3 %      | 96.7 %     | 126.7    | 9.0 / 5.0 / 13.0                     | 10.0 / 6.0 / 15.0  | 17.8 / 9.0 / 27.0  | 25.0 / 40.0 / 21.7 / 13.3 %   | 0.0 / 0.0                       |
| fixed    | false             | 90           | 2       | 0.0 %      | 3.3 %      | 96.7 %     | 126.7    | 11.3 / 7.5 / 16.0                    | 14.0 / 8.0 / 22.0  | 23.0 / 12.0 / 38.0 | 26.7 / 26.7 / 26.7 / 20.0 %   | 0.4 / 0.0                       |
| fixed    | true              | 90           | 1.5     | 0.0 %      | 3.3 %      | 96.7 %     | 126.7    | 9.0 / 5.0 / 13.0                     | 10.0 / 6.0 / 15.0  | 17.8 / 9.0 / 27.0  | 25.0 / 40.0 / 21.7 / 13.3 %   | 0.0 / 0.0                       |
| fixed    | true              | 90           | 2       | 0.0 %      | 3.3 %      | 96.7 %     | 126.7    | 11.5 / 7.5 / 16.5                    | 14.0 / 8.0 / 22.5  | 22.3 / 11.5 / 38.0 | 30.0 / 30.0 / 26.7 / 13.3 %   | 0.5 / 0.0                       |
| ratio    | true              | 50           | 1.5     | 0.0 %      | 3.3 %      | 96.7 %     | 126.7    | 9.0 / 5.5 / 13.0                     | 10.0 / 6.0 / 17.0  | 16.5 / 8.5 / 26.5  | 25.0 / 28.3 / 30.0 / 16.7 %   | 2.0 / 2.0                       |
| ratio    | false             | 90           | 2       | 1.7 %      | 0.0 %      | 98.3 %     | 130.0    | 10.0 / 6.0 / 15.0                    | 15.0 / 8.0 / 21.5  | 26.0 / 14.0 / 39.5 | 28.3 / 33.3 / 33.3 / 5.0 %    | 4.2 / 4.0                       |
| ratio    | false             | 50           | 1.5     | 0.0 %      | 0.0 %      | 100.0 %    | 133.3    | 9.0 / 5.0 / 13.0                     | 10.5 / 6.0 / 17.0  | 17.5 / 8.0 / 26.5  | 13.3 / 30.0 / 36.7 / 20.0 %   | 2.2 / 2.0                       |
| ratio    | true              | 90           | 2       | 0.0 %      | 0.0 %      | 100.0 %    | 133.3    | 11.0 / 7.0 / 16.5                    | 14.0 / 8.0 / 22.0  | 24.0 / 12.5 / 38.0 | 20.0 / 30.0 / 30.0 / 20.0 %   | 4.8 / 4.5                       |

**1 of 24** has all three strategies within 25–42 % at N = 30: R1 and R2 together, no escort,
2 coins per second.

### Stage 2 — the qualifying configuration × 300 matches (seeds 1–300)

Command: `pnpm fairness --configs <R1 + R2, escort 0, 2 coins/s> --matches 300 --seed 1 --jobs
1 --out reports/rule-trials/stage2.json` (2 min 24 s). N = 300 matches (3600 patient, 3600
cautious, 2400 hunter players):

| swapMode | swappedStealProof | escortRadius | spawn/s | patient | cautious | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured    | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) |
| -------- | ----------------- | ------------ | ------- | ------- | -------- | ---------- | -------- | ------------------------------------ | ------------------ | ----------------- | ----------------------------- | ------------------------------- |
| ratio    | true              | 0            | 2       | 24.3 %  | 25.3 %   | **50.3 %** | 34.0     | 13.0 / 8.0 / 21.0                    | 16.5 / 10.0 / 24.0 | 16.0 / 8.0 / 28.0 | 26.2 / 28.0 / 24.2 / 21.7 %   | 8.6 / 8.0                       |

**No configuration holds 25–42 % for all three at N = 300.** The best misses with hunters at
50.3 % and patient and cautious just under 25 %.

### Each rule alone against the default (N = 30, seeds 1–30)

Best-player share patient / cautious / hunter, change in points against the default row of the
same coin rate; swaps per match.

| Rule         | 1.5 coins/s        | change               | swaps | 2 coins/s          | change                | swaps |
| ------------ | ------------------ | -------------------- | ----- | ------------------ | --------------------- | ----- |
| default      | 6.7 / 31.7 / 61.7  | —                    | 0.3   | 10.0 / 41.7 / 48.3 | —                     | 1.3   |
| R1 ratio     | 15.0 / 21.7 / 63.3 | +8.3 / −10.0 / +1.6  | 4.1   | 10.0 / 10.0 / 80.0 | 0 / −31.7 / +31.7     | 9.5   |
| R2 proof     | 13.3 / 31.7 / 55.0 | +6.6 / 0 / −6.7      | 0.3   | 10.0 / 66.7 / 23.3 | 0 / +25.0 / −25.0     | 1.1   |
| R3 escort 50 | 0.0 / 13.3 / 86.7  | −6.7 / −18.4 / +25.0 | 0.1   | 0.0 / 5.0 / 95.0   | −10.0 / −36.7 / +46.7 | 0.8   |
| R3 escort 90 | 0.0 / 3.3 / 96.7   | −6.7 / −28.4 / +35.0 | 0.0   | 0.0 / 3.3 / 96.7   | −10.0 / −38.4 / +48.4 | 0.4   |
| R1 + R2      | 16.7 / 23.3 / 60.0 | +10.0 / −8.4 / −1.7  | 3.8   | 26.7 / 31.7 / 41.7 | +16.7 / −10.0 / −6.6  | 10.1  |

### Round 4: what the numbers say

- **R1 makes swapping happen**: 1.3 → 9.5 swaps per match at 2 coins/s (0.3 → 4.1 at 1.5).
  Alone it feeds the hunters (hunter 48.3 → 80.0 % at 2 coins/s): the swapped coins are just
  more to rob.
- **R2 alone barely acts**: without R1 there is about one swap per match, so it shields
  almost nothing. Its rows still move (cautious 41.7 → 66.7 %, hunter 48.3 → 23.3 % at 2
  coins/s; −6.7 points for hunters at 1.5) — more than so small a change explains; most
  likely the noise of N = 30 in a match where one changed steal changes the whole seed's
  course. Patient stays at about 10 %.
- **R1 and R2 together are the only combination that lifts the patient bot** (10.0 → 26.7 %
  at N = 30, 24.3 % at N = 300), with about 9–10 swaps per match.
- **R3, as measured, makes hunters dominate** (83–100 % in every escort row). A scratch count
  over five seeded matches at the default otherwise (escort 50 against 0): robberies of
  hunters fall from 6801 to 5064, robberies of patient bots rise from 236 to 329; a hunter
  is within 50 of its team's other hunter about 16 % of the time in both. The spread-out
  collectors are rarely beside a teammate (they patrol their own waypoints), so the rule
  shields little of what they carry. Bots that seek escorts could change this; they were not
  built.
- **None meets the target at N = 300.** The best (R1 + R2, 2 coins/s) is off by the hunters
  (50.3 %).

**Recommendation, backed by these numbers**: R1 and R2 together are the approach — the only
rule change that gives all three strategies a real share and makes swapping part of the game
(8.6 swaps per match at N = 300). Leave out R3 as built. What is left is the hunters' 50 %;
the lever measured for that is `stealShare` (0.25 instead of 0.5 moved the hunters' best-player
share from 33.5 to 12.0 % in Round 1 and from 66.0 to 30.0 % in Round 2, N = 300 each). The next measurement would be R1 + R2 with stealShare 0.25 and
0.35 at 2 coins/s, stage 1 and 2. Nothing here changes a default; the owner decides.

## Round 5 — R1 + R2 with a smaller steal share (2026-11-15, `feat/rule-trials`)

Owner decision 2026-11-15: measure everything to find the best approach. Round 4 left the
hunters at 50.3 % with R1 + R2 at 2 coins/s (N = 300); `stealShare` is the lever measured in
Rounds 1 and 2. R3 is not measured further. No code change: the existing switches.

**Config of every row**: `DEFAULT_CONFIG` on `feat/rule-trials` (as Round 4: carry 0.7,
steal cooldown 1000 ms, secure 2500 ms, swap rate 10 → 15, steal range 60, separation 28 /
0.5, ghost radius 14, coin radius 10, bots: cautious 5, hunter 8, deadline margin 3 s,
waypoint 4 s, threat range 150) with **R1 `swapMode` 'ratio' (`swapMinIn` 6), R2
`swappedStealProof` true, R3 `escortRadius` 0** and the two values each row names. 32 bots,
teams rotating. Configurations: `reports/rule-trials/round5-configs.json`.

### Stage 1 — 8 configurations × 30 matches (seeds 1–30)

Grid: `stealShare` {0.2, 0.25, 0.3, 0.35} × `coinSpawnPerSecond` {2, 2.5}. Command: `pnpm
fairness --configs reports/rule-trials/round5-configs.json --matches 30 --seed 1 --jobs 8
--out reports/rule-trials/round5-stage1.json` (50.6 s; CPU load before the start reported as
0 % with `pnpm dev` idle). Bold: all three within 25–42 %. N = 30 matches each (360 patient,
360 cautious, 240 hunter players).

| stealShare | spawn/s | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured     | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) |
| ---------- | ------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ------------------ | ----------------------------- | ------------------------------- |
| 0.35       | 2       | **30.0 %** | **33.3 %** | **36.7 %** | 6.7      | 13.5 / 8.0 / 22.5                    | 17.0 / 10.0 / 24.5 | 14.5 / 7.0 / 26.5  | 33.3 / 26.7 / 13.3 / 26.7 %   | 10.1 / 10.0                     |
| 0.25       | 2       | 41.7 %     | 38.3 %     | 20.0 %     | 26.7     | 15.0 / 10.0 / 23.0                   | 17.5 / 10.0 / 25.0 | 12.5 / 7.5 / 21.5  | 23.3 / 35.0 / 20.0 / 21.7 %   | 10.3 / 10.0                     |
| 0.3        | 2       | 46.7 %     | 40.0 %     | 13.3 %     | 40.0     | 13.5 / 9.0 / 23.5                    | 17.5 / 10.0 / 24.5 | 13.5 / 7.5 / 23.5  | 30.0 / 36.7 / 10.0 / 23.3 %   | 9.7 / 10.0                      |
| 0.35       | 2.5     | 13.3 %     | 36.7 %     | 50.0 %     | 40.0     | 17.0 / 10.0 / 27.5                   | 21.5 / 12.5 / 32.0 | 18.5 / 9.0 / 34.0  | 26.7 / 30.0 / 13.3 / 30.0 %   | 14.6 / 16.0                     |
| 0.2        | 2       | 50.0 %     | 41.7 %     | 8.3 %      | 50.0     | 15.5 / 10.0 / 24.5                   | 17.8 / 11.0 / 25.0 | 12.5 / 7.5 / 20.5  | 16.7 / 35.0 / 26.7 / 21.7 %   | 10.6 / 10.0                     |
| 0.25       | 2.5     | 48.3 %     | 43.3 %     | 8.3 %      | 50.0     | 18.5 / 11.5 / 31.0                   | 22.5 / 14.0 / 31.0 | 15.5 / 8.5 / 23.5  | 20.0 / 33.3 / 13.3 / 33.3 %   | 16.7 / 17.0                     |
| 0.2        | 2.5     | 35.0 %     | 61.7 %     | 3.3 %      | 60.0     | 18.8 / 12.0 / 30.0                   | 23.0 / 15.0 / 33.0 | 15.0 / 7.0 / 23.0  | 35.0 / 30.0 / 13.3 / 21.7 %   | 17.0 / 16.5                     |
| 0.3        | 2.5     | 21.7 %     | 65.0 %     | 13.3 %     | 63.3     | 17.5 / 11.0 / 29.0                   | 22.0 / 13.0 / 33.0 | 17.0 / 10.0 / 28.0 | 33.3 / 33.3 / 16.7 / 16.7 %   | 14.7 / 15.0                     |

**1 of 8** within 25–42 % at N = 30: stealShare 0.35, 2 coins/s.

### Stage 2 — 4 configurations × 300 matches (seeds 1–300)

The one N = 30 hit and the 3 closest to an even split; third place was a tie (0.3 / 2 and
0.35 / 2.5, both 40.0 points), so both ran: `reports/rule-trials/round5-stage2-configs.json`.
Command: `pnpm fairness --configs reports/rule-trials/round5-stage2-configs.json --matches 300
--seed 1 --jobs 4 --out reports/rule-trials/round5-stage2.json` (7 min 16 s; CPU load 74 %
before the start — other work on the PC). N = 300 matches each (3600 patient, 3600 cautious,
2400 hunter players):

| stealShare | spawn/s | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured    | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) |
| ---------- | ------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ----------------- | ----------------------------- | ------------------------------- |
| 0.35       | 2       | **35.0 %** | **32.8 %** | **32.2 %** | 3.3      | 13.5 / 8.5 / 22.5                    | 16.5 / 10.0 / 24.5 | 15.5 / 7.5 / 26.0 | 23.5 / 27.7 / 26.7 / 22.2 %   | 9.1 / 9.0                       |
| 0.35       | 2.5     | 25.2 %     | 31.3 %     | 43.5 %     | 20.3     | 17.0 / 10.0 / 28.5                   | 21.5 / 13.5 / 31.0 | 18.5 / 9.5 / 32.5 | 23.5 / 29.8 / 23.0 / 23.7 %   | 14.2 / 14.0                     |
| 0.3        | 2       | 37.2 %     | 41.6 %     | 21.3 %     | 24.1     | 14.0 / 9.0 / 23.5                    | 17.0 / 10.5 / 25.0 | 14.0 / 7.5 / 23.0 | 21.2 / 31.5 / 23.0 / 24.3 %   | 9.3 / 9.0                       |
| 0.25       | 2       | 39.7 %     | 48.3 %     | 12.0 %     | 42.7     | 14.5 / 9.5 / 23.5                    | 17.5 / 10.5 / 25.0 | 13.5 / 7.5 / 21.5 | 23.0 / 29.7 / 25.2 / 22.2 %   | 10.2 / 10.0                     |

### Round 5: what the numbers say

- **One configuration meets the target at N = 300**: R1 + R2 with `stealShare` 0.35 at 2
  coins per second — patient 35.0 %, cautious 32.8 %, hunter 32.2 % (distance 3.3 points from
  an even split; every share well inside 25–42 %). The first configuration of all five rounds
  to hold the band at N = 300. Secured value per player and match (median / p10 / p90):
  patient 13.5 / 8.5 / 22.5, cautious 16.5 / 10.0 / 24.5, hunter 15.5 / 7.5 / 26.0; teams win
  22.2–27.7 %; 9.1 swaps per match.
- **The steal share is a narrow lever here.** At 2 coins/s the hunters' share goes 12.0 %
  (0.25) → 21.3 % (0.3) → 32.2 % (0.35) → 50.3 % (0.5, Round 4), N = 300 each; 0.3 already
  leaves them below 25 %.
- **More coins hand the game back to the hunters**: at 2.5 coins/s the same 0.35 gives
  25.2 / 31.3 / 43.5 % (N = 300).
- The N = 30 rows again moved by several points against N = 300 (0.35 / 2: 30.0 / 33.3 /
  36.7 → 35.0 / 32.8 / 32.2 %), as in Round 4 — stage 2 for the closest rows was worth it.

Nothing here changes a default; the owner decides which configuration goes into the game.

## Round 6 — a random steal share (2026-11-15, `feat/rule-trials`)

Owner decision 2026-11-15: before the Round 5 configuration goes into the game, measure a
random steal share. New switch `stealShareMax` (absent by default = today's fixed share): each
steal draws its share once, uniformly from [`stealShare`, `stealShareMax`], from the match's
seeded random source; at least one coin per steal (docs/GAME-CORE.md, "Rule trials").

**Config of every row**: `DEFAULT_CONFIG` on `feat/rule-trials` (as Round 5) with **R1
`swapMode` 'ratio' (`swapMinIn` 6), R2 `swappedStealProof` true, R3 `escortRadius` 0,
`coinSpawnPerSecond` 2**, and the steal share each row names:

- **A**: `stealShare` 0, `stealShareMax` 0.5 (share drawn from 0–0.5, mean 0.25).
- **B**: `stealShare` 0.2, `stealShareMax` 0.5 (share drawn from 0.2–0.5, mean 0.35).
- **Reference**: `stealShare` 0.35 fixed — at N = 300 the Round 5 run (not re-run); at N = 30
  re-run for its steal figures, reproducing the Round 5 stage-1 row exactly.

Configurations: `reports/rule-trials/round6-configs-30.json`, `round6-configs-300.json`.
Steals per match count every steal of all 32 bots (most are hunters robbing each other back
and forth); coins per steal over every steal of every match.

### N = 300 (seeds 1–300)

Command: `pnpm fairness --configs reports/rule-trials/round6-configs-300.json --matches 300
--seed 1 --jobs 2 --out reports/rule-trials/round6-n300.json` (4 min 9 s; CPU load 50 % before
the start). Bold: all three within 25–42 %. The reference row is Round 5's
(`round5-stage2.json`), which did not record steals.

| steal share          | N (seeds)   | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured    | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) | steals per match (mean / median) | coins per steal (mean / p10 / p90) |
| -------------------- | ----------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ----------------- | ----------------------------- | ------------------------------- | -------------------------------- | ---------------------------------- |
| 0–0.5                | 300 (1–300) | **35.5 %** | **35.3 %** | **29.2 %** | 8.3      | 13.5 / 8.5 / 23.0                    | 16.5 / 10.0 / 25.0 | 15.5 / 8.0 / 25.0 | 25.7 / 25.5 / 23.8 / 25.0 %   | 8.8 / 8.0                       | 1298.9 / 1295.0                  | 2.1 / 1.0 / 3.0                    |
| 0.2–0.5              | 300 (1–300) | 19.9 %     | 33.7 %     | 46.3 %     | 26.8     | 13.0 / 8.0 / 21.0                    | 16.0 / 10.0 / 24.5 | 16.5 / 8.0 / 27.5 | 23.5 / 30.2 / 27.3 / 19.0 %   | 8.2 / 8.0                       | 1356.4 / 1350.0                  | 2.4 / 1.0 / 4.0                    |
| fixed 0.35 (Round 5) | 300 (1–300) | **35.0 %** | **32.8 %** | **32.2 %** | 3.3      | 13.5 / 8.5 / 22.5                    | 16.5 / 10.0 / 24.5 | 15.5 / 7.5 / 26.0 | 23.5 / 27.7 / 26.7 / 22.2 %   | 9.1 / 9.0                       | —                                | —                                  |

### N = 30 (seeds 1–30)

Command: `pnpm fairness --configs reports/rule-trials/round6-configs-30.json --matches 30 --seed
1 --jobs 3 --out reports/rule-trials/round6-n30.json` (52.5 s; CPU load 43 % before the
start).

| steal share | N (seeds) | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured    | teams won (Sp / Su / Au / Wi) | swaps per match (mean / median) | steals per match (mean / median) | coins per steal (mean / p10 / p90) |
| ----------- | --------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ----------------- | ----------------------------- | ------------------------------- | -------------------------------- | ---------------------------------- |
| fixed 0.35  | 30 (1–30) | **30.0 %** | **33.3 %** | **36.7 %** | 6.7      | 13.5 / 8.0 / 22.5                    | 17.0 / 10.0 / 24.5 | 14.5 / 7.0 / 26.5 | 33.3 / 26.7 / 13.3 / 26.7 %   | 10.1 / 10.0                     | 1469.9 / 1473.5                  | 2.7 / 1.0 / 5.0                    |
| 0–0.5       | 30 (1–30) | 26.7 %     | 43.3 %     | 30.0 %     | 20.0     | 13.5 / 8.0 / 22.0                    | 17.0 / 11.0 / 25.0 | 15.5 / 8.0 / 25.5 | 36.7 / 20.0 / 20.0 / 23.3 %   | 8.7 / 9.0                       | 1304.2 / 1307.0                  | 2.1 / 1.0 / 3.0                    |
| 0.2–0.5     | 30 (1–30) | 18.3 %     | 30.0 %     | 51.7 %     | 36.7     | 13.0 / 8.0 / 22.5                    | 16.5 / 10.0 / 25.5 | 15.8 / 7.5 / 28.5 | 25.0 / 38.3 / 23.3 / 13.3 %   | 8.1 / 7.5                       | 1368.0 / 1333.0                  | 2.4 / 1.0 / 4.0                    |

### Round 6: what the numbers say

- **A (0–0.5) stays within 25–42 % at N = 300**: patient 35.5 %, cautious 35.3 %, hunter
  29.2 % (distance 8.3) — as fair as the fixed 0.35 (35.0 / 32.8 / 32.2 %, distance 3.3), a
  little further from even. **B (0.2–0.5) does not**: hunter 46.3 %, patient 19.9 %.
- **A random share is not its mean.** B's mean share is the reference's 0.35, yet the hunters'
  share is 46.3 % instead of 32.2 %; A's mean is 0.25, yet the hunters get 29.2 % where the
  fixed 0.25 gave them 12.0 % (Round 5, N = 300). What a random share does cannot be read
  from its mean; it has to be measured (why, these runs do not show).
- **The spread of secured values barely changes.** Median / p10 / p90 per player and match at
  N = 300: patient 13.5 / 8.5 / 23.0 (A), 13.0 / 8.0 / 21.0 (B), 13.5 / 8.5 / 22.5 (fixed
  0.35); cautious 16.5 / 10.0 / 25.0, 16.0 / 10.0 / 24.5, 16.5 / 10.0 / 24.5; hunter 15.5 /
  8.0 / 25.0, 16.5 / 8.0 / 27.5, 15.5 / 7.5 / 26.0. The random share moves who ends up best,
  not how much a player secures. Teams stay fair (A 23.8–25.7 %).
- **Smaller steals, a few fewer**: coins per steal A 2.1 (p10 1, p90 3), B 2.4 (1 / 4), fixed
  0.35 2.7 (1 / 5, N = 30); steals per match A 1299, B 1356, fixed 0.35 1470 (N = 30).
- Swaps stay part of the game: 8.8 (A), 8.2 (B), 9.1 (fixed 0.35) per match.

Nothing here changes a default; the owner decides between fixed 0.35, A and B.

## Round 7 — the two fair candidates on fresh seeds (2026-11-16, `feat/rule-trials`)

Round 6 showed equal mean shares acting very differently, so an in-band result might belong to
seeds 1–300. Round 7 runs the two in-band candidates on seeds never used before (301–600).

**Config of both rows**: `DEFAULT_CONFIG` on `feat/rule-trials` with **R1 `swapMode` 'ratio'
(`swapMinIn` 6), R2 `swappedStealProof` true, R3 `escortRadius` 0, `coinSpawnPerSecond` 2**;
everything else default (`carrySpeedFactor` 0.7, `stealCooldownMs` 1000, `secureDurationMs`
2500, `swapOut` 15), and:

- **C1**: `stealShare` 0.35 fixed (the Round 5 configuration).
- **C2**: `stealShare` 0, `stealShareMax` 0.5 (Round 6 variant A).

Configurations: `reports/rule-trials/round7-configs.json`. Command: `pnpm fairness --configs
reports/rule-trials/round7-configs.json --matches 300 --seed 301 --jobs 2 --out
reports/rule-trials/round7-n300.json` (4 min 17 s; CPU load 57 % before the start). N = 300
matches each (3600 patient, 3600 cautious, 2400 hunter players). Bold: all three within
25–42 %. The seeds 1–300 rows are Round 5 (C1) and Round 6 (C2), not re-run.

| candidate       | N (seeds)     | patient    | cautious   | hunter     | distance | patient secured (median / p10 / p90) | cautious secured   | hunter secured    | teams won (Sp / Su / Au / Wi) | swaps per match (mean) | steals per match (mean / median) | coins per steal (mean / p10 / p90) |
| --------------- | ------------- | ---------- | ---------- | ---------- | -------- | ------------------------------------ | ------------------ | ----------------- | ----------------------------- | ---------------------- | -------------------------------- | ---------------------------------- |
| C1 fixed 0.35   | 300 (301–600) | **27.3 %** | **33.0 %** | **39.7 %** | 12.7     | 13.0 / 8.5 / 22.5                    | 17.0 / 10.0 / 24.5 | 15.5 / 7.5 / 26.0 | 21.6 / 25.9 / 23.3 / 29.1 %   | 8.9                    | 1458.1 / 1449.0                  | 2.7 / 1 / 4                        |
| C1 fixed 0.35   | 300 (1–300)   | **35.0 %** | **32.8 %** | **32.2 %** | 3.3      | 13.5 / 8.5 / 22.5                    | 16.5 / 10.0 / 24.5 | 15.5 / 7.5 / 26.0 | 23.5 / 27.7 / 26.7 / 22.2 %   | 9.1                    | —                                | —                                  |
| C2 random 0–0.5 | 300 (301–600) | **28.2 %** | **39.7 %** | **32.1 %** | 12.8     | 13.5 / 9.0 / 22.5                    | 16.5 / 10.0 / 25.0 | 15.5 / 8.0 / 25.0 | 24.2 / 26.5 / 30.7 / 18.7 %   | 8.1                    | 1291.8 / 1284.0                  | 2.1 / 1 / 3                        |
| C2 random 0–0.5 | 300 (1–300)   | **35.5 %** | **35.3 %** | **29.2 %** | 8.3      | 13.5 / 8.5 / 23.0                    | 16.5 / 10.0 / 25.0 | 15.5 / 8.0 / 25.0 | 25.7 / 25.5 / 23.8 / 25.0 %   | 8.8                    | 1298.9 / 1295.0                  | 2.1 / 1 / 3                        |

### Who robs whom (seeds 301–600)

New report field `stealsByPair` (`src/balance.ts`): steals per match by thief strategy ×
victim strategy, counted in the same tick observer as the other steal figures. Mean per
match; in brackets the share of all steals.

| thief → victim | patient      | cautious     | hunter          |
| -------------- | ------------ | ------------ | --------------- |
| C1: hunter     | 51.9 (3.6 %) | 40.1 (2.8 %) | 1366.1 (93.7 %) |
| C2: hunter     | 62.2 (4.8 %) | 44.6 (3.5 %) | 1185.1 (91.7 %) |

Patient and cautious bots never steal (0 in every cell, both candidates): stealing is only the
hunter strategy's action.

### Round 7: what the numbers say

- **Both candidates stay within 25–42 % on the fresh seeds**: C1 27.3 / 33.0 / 39.7 %, C2
  28.2 / 39.7 / 32.1 % (patient / cautious / hunter, N = 300, seeds 301–600) — and on seeds
  1–300 before (C1 35.0 / 32.8 / 32.2 %, C2 35.5 / 35.3 / 29.2 %).
- **The margin is smaller than seeds 1–300 suggested.** Both are now 12.7–12.8 points from an
  even split (before 3.3 and 8.3). C1's hunters moved from 32.2 % to 39.7 %, 2.3 points below
  the upper edge; C2's patient bots from 35.5 % to 28.2 %, 3.2 points above the lower edge.
  The same configuration differs by up to 7.7 points between two sets of 300 seeds; on these
  numbers neither candidate is clearly fairer than the other.
- **Secured values match across seed sets** (median / p10 / p90 within 0.5 of seeds 1–300 for
  every strategy and both candidates).
- **Almost all stealing is hunters robbing hunters**: 93.7 % (C1) and 91.7 % (C2) of all
  steals; hunters rob patient and cautious bots about 90–110 times per match together.
- Teams: C1 21.6–29.1 %, C2 18.7–30.7 % (Winter low on these seeds; on seeds 1–300 Winter was
  25.0 %).

Nothing here changes a default; the owner decides between C1 and C2.

## Adopted — the fair rules are the defaults (2026-11-16)

Owner decision 2026-11-15/16 (CONCEPT.md §14): C2 goes into the game. The switches of Rounds
4–7 are gone; their rules are the defaults: swap from `swapMinIn` 6, swapped coins steal-proof
until the next halving, steal share drawn from [`stealShareMin`, `stealShareMax`] = [0, 0.5],
no escort rule, 2 coins per second. Commands above that name `swapMode`,
`swappedStealProof`, `escortRadius`, `stealShare` or `--rules-grid` run only on the trees they
were measured on.

**Equivalence check**: `pnpm balance --matches 30 --seed 1` with the new defaults (CPU load
40 % before the start) gives exactly the Round 6 N = 30 row of variant A — best player
patient 26.7 %, cautious 43.3 %, hunter 30.0 %; secured median / p10 / p90 13.5 / 8.0 / 22.0,
17.0 / 11.0 / 25.0, 15.5 / 8.0 / 25.5; teams 36.7 / 20.0 / 20.0 / 23.3 %; 8.7 swaps and 1304.2
steals per match.

## Human round 1 — can a human collect coins against bots? (2026-11-16, `feat/human-feel`)

Owner's observation 2026-11-16, playing the night branch against bots only: as a human it is
almost impossible to collect coins; groups of ghosts form at the shrines and dissolve late.

**Config of every row**: `DEFAULT_CONFIG` on `feat/human-feel` — the fair rules (swap from 6,
swapped coins safe, steal share 0–0.5, 2 coins/s), 32 seats, teams rotating per match as in the
balance (`rotatedRoster`), 50 ms ticks, N = 30 matches, seeds 1–30 — plus what each row
names. With every trial off, `pnpm balance --matches 30 --seed 1` gives the Round 6/7 C2 row
exactly (26.7 / 43.3 / 30.0 %). Command: `pnpm human --matches 30 --seed 1 --out
reports/human/round1-n30.json` (all variants of `src/human/variants.ts` up to `bots T1+T2`;
CPU load 100 % in the snapshot before the start, VS Code, Docker and a browser open), then
`--variant bots --out reports/human/round1-groups-n30.json` (the same bot matches, with the
groups' start times) and `--variant T4 --variant "bots T4" --out
reports/human/round1-t4-n30.json` (the three files are not in the repository since
2026-11-16, see "Raw data"). Times per variant 31–184 s. The bot trial variants (T1–T4)
and their switches were removed on 2026-11-16 unused; to repeat a trial row, check out
`3cce2d5`.

**The stand-in** (`src/human/standin.ts`) takes seat 1 (team rotating): it sees only a
player's "Near" view, decides on the state a reaction time old, walks to the nearest coin it
sees and secures at its shrine before every deadline (no swaps, no steals). The view from the
client's constants (`cameraSpan` 1100 field units along the shorter screen side below the
104 px bar): **desktop** 1280 × 800 (and 1920 × 1080) shows **2000 × 1100** field units, a
**phone** in portrait (412 × 915) **1100 × 2000**. Reaction 300 ms is a placeholder. It aims
perfectly and steers in any direction (a keyboard has eight).

### What happens to a coin (bots only, N = 30, seeds 1–30)

17 970 coins spawned; **from spawn to pickup median 1.2 s** (p10 0.25 s, p90 5.2 s, mean 2.4 s);
the **nearest ghost at spawn median 218 field units away** (p10 71, p90 493) — 0.7 s at full
speed; **776 coins (4.3 %) cleared untouched** at a halving.

### What a bot sees (from the code)

Everything, every tick, at once: `collect` reads every coin and every ghost and works out
for each coin the ghost closest to it (`src/bots/common.ts`, `collect` and
`closestGhostByCoin`); `nearestCarrier` (hunter) and `threatened` (patient) read every ghost
(`src/bots/strategies.ts`); `simulate` (`src/simulation.ts`) and the server's
`MatchHost.intents` (`apps/server/src/match-host.ts`) ask every bot on every 50 ms tick with
the current state. No view limit, no delay.

### The stand-in today and per trial (N = 30, seeds 1–30)

Mean per match (median); rank among all seats (1 = most secured). Bot columns: mean per bot
player and match over all bots of that strategy.

| variant                        | stand-in coins  | stand-in secured | robbed | rank                | patient coins / secured | cautious coins / secured | hunter coins / secured |
| ------------------------------ | --------------- | ---------------- | ------ | ------------------- | ----------------------- | ------------------------ | ---------------------- |
| desktop view, 300 ms           | **33.9** (35.0) | **17.0** (15.8)  | 10.6   | **13.6** of 32 (15) | 23.0 / 14.4             | 22.4 / 17.0              | 2.3 / 16.0             |
| phone view, 300 ms             | 35.0 (36.5)     | 16.6 (16.0)      | 11.7   | 15.1 of 32 (14)     | 22.7 / 14.7             | 22.4 / 17.2              | 2.5 / 15.5             |
| full view, no delay            | 49.3 (49.0)     | 23.1 (23.0)      | 15.1   | 6.1 of 32 (5)       | 22.0 / 14.0             | 22.0 / 16.9              | 2.2 / 16.0             |
| desktop, 600 ms (sensitivity)  | 21.1 (20.0)     | 11.3 (11.0)      | 6.2    | 23.5 of 32 (25)     | 23.0 / 14.4             | 23.0 / 17.1              | 2.5 / 16.2             |
| desktop, 1000 ms (sensitivity) | 14.8 (14.5)     | **0.0**          | 5.3    | 32 of 32            | 23.5 / 14.8             | 23.0 / 17.5              | 2.8 / 16.0             |
| T1 bots see a desktop view     | 32.2 (34.5)     | 17.1 (16.0)      | 9.8    | 14.4 of 32 (13)     | 23.0 / 14.3             | 22.2 / 16.9              | 2.9 / 16.5             |
| T2 bots react 300 ms late      | 51.8 (52.5)     | 26.7 (28.5)      | 11.6   | 5.6 of 32 (1.5)     | 21.0 / 14.4             | 20.3 / 15.1              | 3.1 / 14.4             |
| T1 + T2                        | 52.3 (52.0)     | 28.5 (28.5)      | 10.1   | **2.5** of 32 (1)   | 20.8 / 14.4             | 20.2 / 14.7              | 3.6 / 14.6             |
| T3 16 bots beside the human    | 47.7 (48.5)     | 25.9 (25.5)      | 10.3   | 11.5 of 17 (11.5)   | 43.9 / 28.9             | 39.5 / 33.8              | 2.9 / 32.6             |
| T1 + T2 + T3                   | 56.2 (55.5)     | 34.6 (30.5)      | 7.8    | 7.1 of 17 (7.5)     | 40.6 / 30.1             | 36.9 / 31.2              | 4.9 / 24.1             |
| T4 deadline spread 10 s        | 38.0 (37.5)     | 18.4 (18.0)      | 11.4   | 13.3 of 32 (13)     | 23.2 / 15.7             | 22.7 / 17.8              | 2.3 / 15.3             |

The stand-in's four sight variants run against today's bots; T1–T4 with the stand-in as a
desktop player with 300 ms. At 1000 ms it pressed Secure 583 times in 5 matches (seeds 1–5)
and stood inside its shrine in 1592 ticks, but never at a press: it decides on its own
position a second old, by which time it has walked through the shrine (radius 80) — a limit
of the stand-in, which delays its own position too.

### Fairness between the bot strategies (best bot of the match, N = 30, seeds 1–30)

| bots                              | patient | cautious | hunter | all within 25–42 %?                         | hunters robbed per hunter and match |
| --------------------------------- | ------- | -------- | ------ | ------------------------------------------- | ----------------------------------- |
| today (bots only)                 | 26.7 %  | 43.3 %   | 30.0 % | no (cautious 43.3; at N = 300 yes, Round 6) | 149.5                               |
| T1 (bots only)                    | 26.7 %  | 33.3 %   | 40.0 % | **yes**                                     | 144.9                               |
| T2 (bots only)                    | 63.3 %  | 28.3 %   | 8.3 %  | no                                          | 45.3                                |
| T1 + T2 (bots only)               | 71.7 %  | 25.0 %   | 3.3 %  | no                                          | 43.3                                |
| T4 (bots only)                    | 20.0 %  | 43.3 %   | 36.7 % | no                                          | 150.6                               |
| T3 (16 bots + stand-in)           | 21.7 %  | 20.0 %   | 58.3 % | no                                          | 120.2                               |
| T1 + T2 + T3 (16 bots + stand-in) | 46.7 %  | 36.7 %   | 16.7 % | no                                          | 27.1                                |

The only trial within the band at N = 30, T1, does not help the stand-in (rank 14.4 against
13.6 today); the trials that help it most (T2, T1 + T2) break the bots' fairness, so none ran
at N = 300.

### Groups at the shrines (bots only, N = 30, seeds 1–30)

A group: more than 4 ghosts within twice a shrine's radius (160 field units). **855 groups,
28.5 per match; duration median 1.9 s, p90 3.3 s, longest 6.2 s; size median 6, largest 14.**
At the peak 80 % belong to the shrine's team, 19 % are securing, carried coins median 3 (p90
7). When they form (`round1-groups-n30.json`): 120 are the start positions (first 2 s); of the
other 735, **464 (63 %) form 5–10 s before a deadline** (91 % own team, duration median 3.2 s),
85 in its last 5 s, 186 at other times. **Groups of 8 or more** (113, not counting the start):
formed at a median 5.8 s before a deadline; **54 % hunters**, 62 % own team, 31 % securing.
With T4 (deadline spread 10 s) the groups 5–10 s before a deadline fall to 258 (duration median
1.1 s), all groups to 784, those of 8 or more to 93 (76 % hunters).

### Human round 1: what the numbers say

- **A coin lasts about a second.** Median 1.2 s from spawn to pickup; the nearest bot is a
  median 218 units away when it appears.
- **A collector with a desktop view and 300 ms reaction beats the bots at collecting** (33.9
  coins per match against 22–23) and lands mid-table (rank 13.6 of 32). The view costs
  little: with the whole field and no delay it collects 49.3 (rank 6.1).
- **The reaction time decides steeply**: at 600 ms 21.1 coins and rank 23.5, at 1000 ms 14.8
  coins. The owner's experience fits a total delay well above 300 ms between a coin appearing
  and the own ghost turning to it — reaction, the client's 100 ms render buffer, the ≤ 100 ms
  input send interval and the tick — together with imperfect aim and eight-way keys, which
  the stand-in does not model; not what the bots see.
- **Bot trials**: T2 (late bots) and T1 + T2 help the stand-in most (rank 5.6 and 2.5) but
  break the bots' fairness — hunters win 8 % and 3 % of matches, because a late hunter loses
  the steal-back race (hunters robbed 149 → 45 per match). T1 alone is fair and changes
  nothing for the stand-in: a desktop view already covers the whole field width. T3 lets
  everyone collect more and leaves the stand-in below every bot strategy's average secured
  value. T4 shortens the deadline crowds but moves patient to 20 % at N = 30.
- **Shrine groups are the deadline rush**: a team's patient and cautious bots set off home by
  the same rule and arrive together; the big ones are hunters waiting beside carriers that
  stand still to secure. They last seconds, not long (longest 6.2 s).

Nothing here changes a default; the owner decides whether any trial goes into the game.

## Response — the client's own delay (2026-11-16, `feat/human-feel`)

Human round 1 ends on "a total delay well above 300 ms". This round measures the real client's
part of it, makes the own ghost answer at once, and runs the stand-in with the measured delays.

**Setup**: `pnpm latency` (docs/CLIENT.md): its own server (3938, 20 Hz, the default 5-minute
match, 31 bots) and client (5938), one headless desktop Chromium at 1280 × 800; 90 s of
collecting coins, then 55 movement key presses of 400 ms, each from standing; 50 samples for
the key and the coin rows. Times are the frames' `requestAnimationFrame` times; the screen
shows a frame up to one more refresh later (16.7 ms at 60 Hz). Background: the owner's
`pnpm dev` running, CPU busy 22–24 % of 14 cores during each run. Summaries:
`reports/response/latency-before.json`, `latency-after.json`.

### Key press → own ghost drawn moving (ms, median / p90, N = 50)

| Part                                                              | Before (today) | After (prediction) |
| ----------------------------------------------------------------- | -------------- | ------------------ |
| Whole: key → drawn moving                                         | 113 / 129      | 8 / 14             |
| Key → direction sent                                              | 10 / 14        | 4 / 8              |
| Sent → a state with the moved ghost arrived (tick wait, way back) | 37 / 60        | 31 / 50            |
| That state arrived → drawn moving                                 | 64 / 75        | −27 / −10          |

Before, a press from standing waited for the next frame (the 100 ms send interval did not bite
from standing), up to a tick on the server, and then the render buffer: other ghosts and the
own one are drawn 100 ms behind the newest state, and a movement shows once the render time
passes the last state before it (100 ms less one tick). After, the own ghost moves in the next
frame; the server's state follows about 30 ms later (the negative last row). p10: 80 ms
before, 3 ms after. In the first two runs the samples also took in the collecting phase's key
changes while moving (every 50 ms): there, before the change, the 100 ms send interval added
up to 100 ms (221 / 351 ms), after it 8 / 16 ms.

### Coin spawned on the server → drawn (ms, median / p90, N = 50)

| Part                        | Before    | After   |
| --------------------------- | --------- | ------- |
| Whole                       | 122 / 125 | 10 / 18 |
| Server tick → state arrived | 2 / 11    | 3 / 12  |
| State arrived → coin drawn  | 118 / 123 | 6 / 8   |

### The coin source: the pickup offset (ms, median, p10 – p90)

From the first frame in which the drawn ghost and the drawn coin touch to the first frame
without the coin; positive: the coin goes after the touch. Both coin sources are worked out
from one recording (the frame's render target for the buffered moment, its newest state for
the newest coins).

| Ghost                    | Coins of the buffered moment (until today) | Coins of the newest state |
| ------------------------ | ------------------------------------------ | ------------------------- |
| Own, after (N = 9)       | **197** (183 – 223)                        | **66** (48 – 89)          |
| Others, after (N = 286)  | 32 (0 – 50)                                | −114 (−132 – −85)         |
| Own, before (N = 21)     | 17 (0 – 48)                                | −84 (−102 – −65)          |
| Others, before (N = 231) | 31 (0 – 50)                                | −82 (−100 – −55)          |

**Rule of the task: the smaller own-ghost offset wins — the newest state's coins** (66 ms
against 197 ms with the prediction on). The price: another ghost's coin now disappears about
114 ms before its drawn shape reaches it.

### The stand-in with the measured delays (desktop view, N = 30, seeds 1–30)

Delay = the measured key → movement median + 250 ms of human reaction. The simulation decides
on the newest state at least the delay old, in 50 ms ticks, so a delay acts as the next whole
tick up.

| Delay                           | Acts as | Coins picked up | Secured | Rank (of 32) |
| ------------------------------- | ------- | --------------- | ------- | ------------ |
| Today: 113 + 250 = 363 ms       | 400 ms  | 30.5            | 17.8    | 13.0         |
| After the fix: 8 + 250 = 258 ms | 300 ms  | 33.9            | 17.0    | 13.6         |

(Means; the 258 ms row is the `desktop` row of Human round 1, the same matches.) Command:
`pnpm human --matches 30 --seed 1 --variant desktop --reaction 363 --reaction 258`. Bots and
rules unchanged: `pnpm balance --matches 30 --seed 1` still gives 26.7 / 43.3 / 30.0 %, 8.7
swaps, 1304.2 steals, 39 125 steals.

### Response: what the numbers say

- **The client's own delay was about 110 ms from standing**, two thirds of it the render
  buffer; while steering, up to 100 ms more from the send interval. With the prediction a key
  shows in the next frame (8 ms median) and a new coin appears within 10 ms of its arrival.
- **For the stand-in 100 ms less delay changes little**: 3.4 coins more, secured value and
  rank within the spread of the matches (rank p10–p90 3–21). The stand-in sees its own ghost
  as late as everything else and aims perfectly; a real player with the fix sees the own
  ghost at once, which the model does not capture. What the owner felt as "almost
  impossible" is not explained by the client's delay alone.

## Raw data

Raw per-run outputs above 200 KB are not in the repository since 2026-11-16 (`.gitignore`; new
ones go to `reports/raw/`). Every summary above names its N, seeds and config; the simulation
is deterministic, so the same commit, command and seeds give the same file. The history still
holds the old copies (`git show 3cce2d5:<file>`).

| File                                   | What, N, seeds                                                     | Regenerate                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `reports/fairness/stage1-grid.json`    | Round 3 stage 1, 288 configurations × 30 matches, seeds 1–30       | on `7910509`: `pnpm fairness --grid --matches 30 --seed 1 --jobs 8 --out reports/fairness/stage1-grid.json`              |
| `reports/human/round1-n30.json`        | Human round 1, the variants up to `bots T1+T2`, N = 30, seeds 1–30 | on `1d9b12e`: `pnpm human --matches 30 --seed 1 --out reports/human/round1-n30.json`                                     |
| `reports/human/round1-groups-n30.json` | Human round 1, bots only with the groups' start times, same seeds  | on `3cce2d5`: `pnpm human --matches 30 --seed 1 --variant bots --out reports/human/round1-groups-n30.json`               |
| `reports/human/round1-t4-n30.json`     | Human round 1, trial T4, same seeds                                | on `3cce2d5`: `pnpm human --matches 30 --seed 1 --variant T4 --variant "bots T4" --out reports/human/round1-t4-n30.json` |

## V5 round 1 — the price board (2026-11-16, `feat/v5-rules`, CHAIN 2026-11-16-V5)

The rules of concept V5.0 (CONCEPT.md §2a, §15): coins of all four seasons fall, a price board
prices each coin by its season's relation to the season in season (in season / next / the
other two), every halving moves the prices on, secure at the own shrine; no stealing, no
swap. Two bot styles, 4 of each per team: **banker** (today's valuable coins, secures from a
load worth 12 and before every deadline) and **planner** (the next season's coins, carried
across the halving, secured right after it and before the end). Target (owner decision
2026-11-16): each style's best player wins 40–60 % of matches.

Config: the defaults of `packages/game-core/src/config.ts` on `feat/v5-rules` (5:00 match,
four seasons of 75 s from Spring, field 2000, speed 300, carrying × 0.7, secure 2.5 s, field
coins at most 60, `bots.bankerSecureValue` 12, `deadlineMarginMs` 3000, `waypointMs` 4000)
with these three changed per configuration: `prices` {4/2/1, 3/2/1, 5/2/1, 4/3/1} ×
`spawnWeights` {1/1/1 equal, 0.5/1/1 the season in season at half weight} ×
`coinSpawnPerSecond` {2, 3} = 16. Command: `pnpm fairness --grid --matches 30 --seed 1
--jobs 6` (stage 1), `pnpm fairness --configs <the qualifying six> --matches 300 --seed 1
--jobs 6` (stage 2); raw files `reports/raw/v5-stage1-n30.json`, `v5-stage2-n300.json`
(git-ignored). Machine: 14 logical cores, 6 jobs. Background load (Windows' processor load):
8 % before stage 1, 1 % right after; 22 % before stage 2, 97 % during it. Stage 1 took 66 s,
stage 2 229 s. The load during stage 2 was more than 6 jobs explain (a dev server with 32
bots was running); the numbers do not depend on it — every match is seeded and
deterministic.

Columns: best player of the match per style; secured points per player and match, median
(p10–p90); matches won per team; coins carried across the halvings per match (median).

### Stage 1 — 16 configurations × 30 matches (seeds 1–30)

| prices | spawn weights | spawn/s | banker best | planner best | banker secured median (p10â€“p90) | planner secured median (p10â€“p90) | team wins Sp/Su/Au/Wi     | carried across / match (median) |
| ------ | ------------- | ------- | ----------- | ------------ | --------------------------------- | ---------------------------------- | ------------------------- | ------------------------------- |
| 4/3/1  | 1/1/1         | 3       | 52.2 %      | 47.8 %       | 60.0 (39.0â€“87.0)                | 60.0 (41.0â€“86.0)                 | 16.7 / 45.0 / 21.7 / 16.7 | 361                             |
| 5/2/1  | 1/1/1         | 2       | 46.7 %      | 53.3 %       | 39.0 (23.0â€“59.0)                | 41.0 (24.0â€“60.0)                 | 10.0 / 36.7 / 13.3 / 40.0 | 243                             |
| 4/2/1  | 1/1/1         | 3       | 43.3 %      | 56.7 %       | 54.0 (34.0â€“75.0)                | 53.0 (36.0â€“78.0)                 | 20.0 / 30.0 / 16.7 / 33.3 | 363                             |
| 3/2/1  | 1/1/1         | 2       | 43.3 %      | 56.7 %       | 30.0 (19.0â€“45.0)                | 32.0 (20.0â€“45.0)                 | 33.3 / 20.0 / 16.7 / 30.0 | 246                             |
| 4/3/1  | 1/1/1         | 2       | 41.7 %      | 58.3 %       | 38.0 (23.0â€“57.0)                | 42.0 (26.0â€“58.0)                 | 20.0 / 20.0 / 20.0 / 40.0 | 247                             |
| 4/2/1  | 1/1/1         | 2       | 40.0 %      | 60.0 %       | 34.0 (20.0â€“52.0)                | 36.5 (22.0â€“53.0)                 | 16.7 / 36.7 / 16.7 / 30.0 | 246                             |
| 5/2/1  | 1/1/1         | 3       | 61.7 %      | 38.3 %       | 61.0 (40.0â€“87.0)                | 59.0 (40.0â€“83.0)                 | 21.7 / 48.3 / 10.0 / 20.0 | 361                             |
| 4/3/1  | 0.5/1/1       | 3       | 33.3 %      | 66.7 %       | 54.0 (35.0â€“75.0)                | 63.0 (43.0â€“87.0)                 | 26.7 / 26.7 / 13.3 / 33.3 | 362                             |
| 3/2/1  | 1/1/1         | 3       | 31.7 %      | 68.3 %       | 47.0 (30.0â€“64.0)                | 47.0 (32.0â€“67.0)                 | 18.3 / 36.7 / 11.7 / 33.3 | 364                             |
| 3/2/1  | 0.5/1/1       | 2       | 23.3 %      | 76.7 %       | 27.0 (17.0â€“39.0)                | 33.0 (21.0â€“47.0)                 | 26.7 / 21.7 / 16.7 / 35.0 | 246                             |
| 3/2/1  | 0.5/1/1       | 3       | 23.3 %      | 76.7 %       | 41.0 (27.0â€“58.0)                | 50.0 (33.0â€“68.0)                 | 16.7 / 33.3 / 30.0 / 20.0 | 368                             |
| 5/2/1  | 0.5/1/1       | 2       | 16.7 %      | 83.3 %       | 31.0 (19.0â€“48.0)                | 43.0 (26.0â€“63.0)                 | 25.0 / 18.3 / 21.7 / 35.0 | 248                             |
| 4/3/1  | 0.5/1/1       | 2       | 16.7 %      | 83.3 %       | 34.0 (22.0â€“51.0)                | 43.0 (26.0â€“62.0)                 | 20.0 / 21.7 / 21.7 / 36.7 | 247                             |
| 5/2/1  | 0.5/1/1       | 3       | 15.0 %      | 85.0 %       | 49.0 (31.0â€“73.0)                | 63.0 (40.0â€“88.0)                 | 30.0 / 30.0 / 11.7 / 28.3 | 365                             |
| 4/2/1  | 0.5/1/1       | 3       | 11.1 %      | 88.9 %       | 45.5 (30.0â€“66.0)                | 56.0 (37.0â€“75.0)                 | 38.3 / 20.0 / 25.0 / 16.7 | 366                             |
| 4/2/1  | 0.5/1/1       | 2       | 10.0 %      | 90.0 %       | 29.0 (19.0â€“44.0)                | 38.0 (24.0â€“53.0)                 | 20.0 / 20.0 / 23.3 / 36.7 | 245                             |

Six of 16 have both styles within 40–60 %; all six have equal spawn weights. With the season
in season at half weight the planner wins 67–90 %: fewer coins of the season in season make
the banker's coins rarer, while the next season's coins the planner wants stay common.

### Stage 2 — the six qualifying configurations × 300 matches (seeds 1–300)

| prices | spawn weights | spawn/s | banker best | planner best | banker secured median (p10â€“p90) | planner secured median (p10â€“p90) | team wins Sp/Su/Au/Wi     | carried across / match (median) |
| ------ | ------------- | ------- | ----------- | ------------ | --------------------------------- | ---------------------------------- | ------------------------- | ------------------------------- |
| 4/2/1  | 1/1/1         | 2       | 48.5 %      | 51.5 %       | 35.0 (21.0â€“52.0)                | 36.0 (22.0â€“53.0)                 | 20.5 / 33.0 / 21.8 / 24.7 | 244                             |
| 4/2/1  | 1/1/1         | 3       | 48.1 %      | 51.9 %       | 53.0 (34.0â€“76.0)                | 54.0 (36.0â€“76.0)                 | 22.2 / 38.0 / 17.5 / 22.3 | 362                             |
| 5/2/1  | 1/1/1         | 2       | 48.0 %      | 52.0 %       | 39.0 (23.0â€“60.0)                | 41.0 (25.0â€“60.0)                 | 20.3 / 31.8 / 22.0 / 25.8 | 243                             |
| 4/3/1  | 1/1/1         | 2       | 45.3 %      | 54.7 %       | 39.0 (24.0â€“59.0)                | 41.0 (26.0â€“59.0)                 | 21.3 / 31.7 / 19.2 / 27.8 | 243                             |
| 4/3/1  | 1/1/1         | 3       | 56.1 %      | 43.9 %       | 60.0 (39.0â€“87.0)                | 60.0 (40.0â€“84.0)                 | 20.5 / 38.8 / 16.8 / 23.8 | 359                             |
| 3/2/1  | 1/1/1         | 2       | 39.7 %      | 60.3 %       | 30.0 (19.0â€“44.0)                | 32.0 (20.0â€“47.0)                 | 21.8 / 32.5 / 22.7 / 23.0 | 246                             |

### The human stand-in (desktop view, 300 ms; `pnpm human --variant desktop`, N = 30, seeds 1–30)

The best stage-2 configuration is the default itself (4/2/1, equal weights, 2 coins/s), so
one run covers both. Per match: coins picked up 18.1 mean (median 18, p10 11, p90 25);
secured 33.8 (34, 16, 52); rank 17.4 of 32 (median 17.5, p10 2, p90 31). The bots in the same
matches: banker 35.0 secured (35, 21, 50), planner 37.9 (37, 24, 52); best bot banker 40.0 %,
planner 60.0 %. Raw file `reports/raw/v5-human-default.json`.

### V5 round 1: what the numbers say

- The concept's starting values (4/2/1, equal, 2/s) are the most even of all 16: 48.5 % /
  51.5 % at N = 300. 4/2/1 at 3 coins/s (48.1 / 51.9) and 5/2/1 at 2/s (48.0 / 52.0) are as
  close; 4/3/1 at 3/s turns to the banker (56.1 %), 3/2/1 at 2/s just leaves the band towards
  the planner (60.3 %).
- Weighting the season in season down breaks the balance in every case: the planner wins
  67–90 % at N = 30.
- Both styles secure about the same (medians 35 and 36 points at the defaults): the two ways
  of playing are worth the same, which the target asks for.
- A human stand-in that collects the nearest coin it sees and secures before every deadline
  lands mid-field (median rank 17.5 of 32) with about what a bot secures.
- Team Summer wins 32–39 % at N = 300 in every configuration instead of 25 %. Teams rotate
  through the slots, so this is the field side of Summer's shrine, not its players; worth a
  look before the owner decides (not part of this round).
- No default was changed: prices and spawn values are the owner's to decide.
