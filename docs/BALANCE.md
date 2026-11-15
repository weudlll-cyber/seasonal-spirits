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

Every row uses `DEFAULT_CONFIG` of `packages/game-core/src/config.ts` at this commit
(5-minute match, halving at every season change, swap 10 → 15, half value off-season,
secure 2.5 s, steal range 60, steal cooldown 1 s, field 2000, speed 300, max 60 field coins,
bots: cautious banks at 5, hunter at 8, deadline margin 3 s) with one change:

| Name                  | Change                       | `stealShare` | `coinSpawnPerSecond` | `carrySpeedFactor` |
| --------------------- | ---------------------------- | ------------ | -------------------- | ------------------ |
| current               | none                         | 0.5          | 2                    | 0.7                |
| stealShare=0.25       | a steal takes a quarter      | 0.25         | 2                    | 0.7                |
| stealShare=0.75       | a steal takes three quarters | 0.75         | 2                    | 0.7                |
| coinSpawnPerSecond=1  | half as many coins           | 0.5          | 1                    | 0.7                |
| coinSpawnPerSecond=3  | 1.5 times as many coins      | 0.5          | 3                    | 0.7                |
| carrySpeedFactor=0.5  | carriers much slower         | 0.5          | 2                    | 0.5                |
| carrySpeedFactor=0.85 | carriers barely slower       | 0.5          | 2                    | 0.85               |

## Stage 1 — 30 matches each (seeds 1–30)

Command: `pnpm balance --matches 30 --seed 1 --variant all`.

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

#### current after the hunter fix and soft separation (2026-11-15) — N = 30, seeds 1–30

Same command, same seeds, on `feat/readability`: hunters no longer rob each other in a
standing pack (docs/GAME-CORE.md, "Bots"), and ghosts softly push each other apart
(`separationRadius` 28, `separationStrength` 0.5). Stage 1 and 2 above and below are from
before both changes.

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

To tell the two changes apart, the same 30 matches ran once more with the hunter fix but
`separationStrength` 0 (a one-off scratch run through `runBalance`, not a variant of the
command): best player patient 26.7 %, cautious 3.3 %, hunter 70.0 %; mean secured value
patient 6.5 (median 1.0), cautious 18.4 (17.0), hunter 27.7 (24.0); field coins gone at the
halvings 28.9 per match.

Reading: the hunter fix moves most. Before it, the hunters of a match spent most of it robbing
each other in one standing pack (the "stuck bots"); now they go after the patient bots, who
carry their coins the longest, and the patient strategy collapses (mean 21.8 → 3.6).
Separation adds a little: crowds around a coin or a shrine spread, the cautious bots bank a
bit more, the hunters a bit less, and fewer coins are left on the field at the halvings.
Teams stay even. No default was changed; this is input for the owner's decision (BACKLOG d).

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

### Which variants go to stage 2

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

## Stage 2 — 300 matches each (seeds 1–300)

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

## What the numbers say

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
