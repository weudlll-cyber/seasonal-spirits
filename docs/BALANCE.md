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
