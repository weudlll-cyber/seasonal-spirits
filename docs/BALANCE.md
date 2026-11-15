# Balance by simulation

`pnpm balance --matches <n> --seed <s> [--variant <name> ...]` plays n headless 32-bot
matches of the game core (seeds s … s+n−1) and sums them up
(`packages/game-core/src/balance.ts`, `balance-cli.ts`). Every match has 8 ghosts per team:
3 patient, 3 cautious, 2 hunters (docs/GAME-CORE.md, "Bots"). Teams rotate: in match k every
slot's team is shifted by k, so over the matches each slot plays from every corner and a
team's numbers measure its side of the field.

What the tables show, each with its N:

- **Best player of the match**: the share of matches whose best player (most secured value)
  used that strategy; ties are split.
- **Mean, median, p10, p90**: secured value per player and match (nearest-rank percentiles).
- **Matches won** per team: the share of matches the team had the most secured value.
- **Field coins gone at the halvings**: coins of the old season still on the field at the
  three halvings, per match.

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
