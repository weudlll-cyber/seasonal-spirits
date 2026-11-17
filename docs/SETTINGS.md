# Settings

Generated from `packages/game-core/src/settings.ts` by `pnpm settings:doc` — do not edit by
hand. Every number that shapes play; all placeholders the owner sets in the admin panel.

## General

| Key              | Setting                              | Range                     | Default | Modes            | Applies    |
| ---------------- | ------------------------------------ | ------------------------- | ------- | ---------------- | ---------- |
| `teamSize`       | Team size (seats bots fill)          | 1–12 seats (step 1)       | 8       | sumo, hill, bomb | next match |
| `ghostRadius`    | Ghost size (radius)                  | 8–32 u (step 1)           | 16      | sumo, hill, bomb | next match |
| `maxSpeed`       | Walking speed                        | 120–480 u/s (step 10)     | 240     | sumo, hill, bomb | now        |
| `acceleration`   | Acceleration                         | 300–3000 u/s² (step 50)   | 900     | sumo, hill, bomb | now        |
| `friction`       | Friction (speed lost per second)     | 0.5–6 /s (step 0.1)       | 2.5     | sumo, hill, bomb | now        |
| `dashSpeed`      | Dash strength                        | 160–1200 u/s (step 10)    | 480     | sumo, hill, bomb | now        |
| `dashTime`       | Dash: knocks for                     | 0.05–0.6 s (step 0.05)    | 0.25    | sumo, hill, bomb | now        |
| `dashCooldown`   | Dash: cooldown                       | 0.3–5 s (step 0.1)        | 1.5     | sumo, hill, bomb | now        |
| `knockSpeed`     | Push strength (a dash hit)           | 0–960 u/s (step 10)       | 320     | sumo, hill, bomb | now        |
| `knockWeight`    | Thrown ghost weight                  | 1–20 × (step 1)           | 10      | sumo, hill, bomb | now        |
| `restitution`    | Bounce                               | 0–1 share (step 0.05)     | 0       | sumo, hill, bomb | now        |
| `inSeasonPush`   | In-season push factor                | 1–2 × (step 0.05)         | 1.25    | sumo, hill, bomb | now        |
| `jump`           | Jump                                 | off / on                  | on      | sumo, hill, bomb | now        |
| `jumpAir`        | Jump: time in the air                | 0.2–1.5 s (step 0.05)     | 0.5     | sumo, hill, bomb | now        |
| `jumpCooldown`   | Jump: cooldown                       | 0.5–5 s (step 0.1)        | 3       | sumo, hill, bomb | now        |
| `jumpSteer`      | Jump: steering left in the air       | 0–1 share (step 0.05)     | 0.1     | sumo, hill, bomb | now        |
| `fall`           | Fall animation                       | 0.2–1.5 s (step 0.1)      | 0.6     | sumo, hill, bomb | now        |
| `respawn`        | Respawn delay (from the fall)        | 0.5–10 s (step 0.5)       | 3       | sumo, hill, bomb | now        |
| `protect`        | Spawn protection                     | 0–5 s (step 0.1)          | 1       | sumo, hill, bomb | now        |
| `credit`         | Knockout credit window               | 0.5–10 s (step 0.5)       | 3       | sumo, hill, bomb | now        |
| `respawnInner`   | Respawn band: from (share of radius) | 0–1 share (step 0.05)     | 0.25    | sumo, hill, bomb | now        |
| `respawnOuter`   | Respawn band: to (share of radius)   | 0–1 share (step 0.05)     | 0.75    | sumo, hill, bomb | now        |
| `startSpread`    | Start ring (share of radius)         | 0.2–0.9 share (step 0.05) | 0.6     | sumo, hill, bomb | next match |
| `edgeEase`       | Edge easing after a halving          | 0.5–5 s (step 0.1)        | 2       | sumo, hill, bomb | now        |
| `countdown`      | Countdown before a deadline          | 3–20 s (step 1)           | 10      | sumo, hill       | now        |
| `resultPause`    | Result pause                         | 3–60 s (step 1)           | 15      | sumo, hill, bomb | next match |
| `reconnectGrace` | Reconnect grace                      | 0–60 s (step 1)           | 12      | sumo, hill, bomb | now        |

## Bots

| Key                 | Setting                                      | Range                     | Default | Modes            | Applies |
| ------------------- | -------------------------------------------- | ------------------------- | ------- | ---------------- | ------- |
| `botReactionMin`    | Reaction: fastest                            | 0.1–1 s (step 0.05)       | 0.25    | sumo, hill, bomb | now     |
| `botReactionMax`    | Reaction: slowest                            | 0.1–1.5 s (step 0.05)     | 0.45    | sumo, hill, bomb | now     |
| `botJitter`         | Reaction: ± per decision                     | 0–0.2 s (step 0.01)       | 0.05    | sumo, hill, bomb | now     |
| `botAimNoise`       | Aim noise                                    | 0–30 ° (step 1)           | 6       | sumo, hill, bomb | now     |
| `botFormMin`        | Form: weakest                                | 0.5–1 × (step 0.05)       | 0.85    | sumo, hill, bomb | now     |
| `botFormMax`        | Form: best                                   | 1–1.5 × (step 0.05)       | 1.15    | sumo, hill, bomb | now     |
| `botFormStep`       | Form: largest step                           | 0–0.3 × (step 0.01)       | 0.06    | sumo, hill, bomb | now     |
| `botFormEvery`      | Form: drifts every                           | 1–20 s (step 1)           | 5       | sumo, hill, bomb | now     |
| `botDashChance`     | Dash chance taken                            | 0–1 share (step 0.05)     | 0.6     | sumo, hill, bomb | now     |
| `botDashGap`        | Least time between dashes                    | 0.5–10 s (step 0.5)       | 3       | sumo, hill, bomb | now     |
| `botHesitateChance` | Hesitation chance per decision               | 0–0.02 share (step 0.001) | 0.002   | sumo, hill, bomb | now     |
| `botHesitate`       | Hesitation                                   | 0–2 s (step 0.1)          | 0.4     | sumo, hill, bomb | now     |
| `botJumpChance`     | Jump over a dash at it                       | 0–1 share (step 0.05)     | 0.5     | sumo, hill, bomb | now     |
| `botDashRange`      | Dash range                                   | 60–400 u (step 10)        | 220     | sumo, hill, bomb | now     |
| `botDashAim`        | Dash only when lined up (cosine)             | 0–1 cos (step 0.05)       | 0.9     | sumo, hill, bomb | now     |
| `botWander`         | Wander point moves every                     | 0.5–10 s (step 0.5)       | 3       | sumo, hill, bomb | now     |
| `botApproach`       | Approach from the side (share of dash range) | 0–1 share (step 0.05)     | 0.25    | sumo, hill, bomb | now     |
| `botLead`           | Endgame: aim ahead                           | 0–1 s (step 0.05)         | 0.3     | sumo, hill       | now     |
| `botBoldAt`         | Endgame: bold below this many left           | 2–32 ghosts (step 1)      | 8       | sumo, hill       | now     |
| `botBoldAim`        | Endgame: widest dash angle (cosine)          | -1–1 cos (step 0.05)      | 0.5     | sumo, hill       | now     |
| `botCommit`         | Endgame: attack anyway after                 | 0.5–10 s (step 0.5)       | 3       | sumo, hill       | now     |

## Sumo

| Key             | Setting                                     | Range                                                 | Default          | Modes | Applies    |
| --------------- | ------------------------------------------- | ----------------------------------------------------- | ---------------- | ----- | ---------- |
| `sumoMatch`     | Match length                                | 60–600 s (step 15)                                    | 300              | sumo  | next match |
| `sumoSeason`    | Season length (a halving each)              | 15–150 s (step 5)                                     | 75               | sumo  | next match |
| `arenaRadius`   | Arena size at the start (radius)            | 160–960 u (step 10)                                   | 400              | sumo  | now        |
| `sumoShrink`    | Each halving: radius ×                      | 0.5–0.95 × (step 0.01)                                | 0.71             | sumo  | now        |
| `lives`         | Lives                                       | 1–9 lives (step 1)                                    | 3                | sumo  | next match |
| `variant`       | Variant                                     | Points / Last One Standing / Alternate                | Points           | sumo  | next match |
| `afterLast`     | After the last season                       | Stop, time limit / Keep halving / Stop, no time limit | Stop, time limit | sumo  | now        |
| `halvingEvery`  | Keep halving every                          | 30–120 s (step 5)                                     | 75               | sumo  | now        |
| `botEdgeMargin` | Bots: edge margin                           | 0–300 u (step 10)                                     | 140              | sumo  | now        |
| `botEdgeShare`  | Bots: edge margin at most (share of radius) | 0.1–1 share (step 0.05)                               | 0.35             | sumo  | now        |
| `botEdgeSlack`  | Bots: own margin from (share of it)         | 0.2–1 share (step 0.05)                               | 0.6              | sumo  | now        |

## King of the Season

| Key          | Setting                                      | Range                   | Default | Modes | Applies    |
| ------------ | -------------------------------------------- | ----------------------- | ------- | ----- | ---------- |
| `hillMatch`  | Match length                                 | 60–600 s (step 15)      | 180     | hill  | next match |
| `hillJump`   | Zone jump interval                           | 15–120 s (step 5)       | 45      | hill  | next match |
| `hillWall`   | Field size (half its side)                   | 400–900 u (step 10)     | 700     | hill  | next match |
| `zoneRadius` | Zone size at the start (radius)              | 100–500 u (step 10)     | 300     | hill  | next match |
| `zoneShrink` | Each jump: zone radius ×                     | 0.5–1 × (step 0.01)     | 0.71    | hill  | now        |
| `hillRate`   | Points per second in the zone                | 1–5 pts/s (step 1)      | 1       | hill  | now        |
| `bounce`     | Bounce: pushed out within                    | 0.2–3 s (step 0.1)      | 1       | hill  | now        |
| `botHold`    | Bots: hold a spot within (share of the zone) | 0.1–1 share (step 0.05) | 0.5     | hill  | now        |

## Halving Bomb

| Key             | Setting                                    | Range                 | Default | Modes | Applies    |
| --------------- | ------------------------------------------ | --------------------- | ------- | ----- | ---------- |
| `bombMatch`     | Match length                               | 60–600 s (step 15)    | 180     | bomb  | next match |
| `bombBlast`     | Blast interval                             | 10–60 s (step 5)      | 20      | bomb  | next match |
| `bombWall`      | Field size (half its side)                 | 400–900 u (step 10)   | 700     | bomb  | next match |
| `bombCountdown` | Countdown before a blast                   | 2–10 s (step 1)       | 5       | bomb  | now        |
| `perBomb`       | Players per bomb                           | 2–16 players (step 1) | 8       | bomb  | now        |
| `passBack`      | No pass back for                           | 0–3 s (step 0.1)      | 1       | bomb  | now        |
| `blastShare`    | A blast takes (share of the points)        | 0–1 share (step 0.05) | 0.5     | bomb  | now        |
| `bombRate`      | Points per second                          | 1–5 pts/s (step 1)    | 1       | bomb  | now        |
| `botFlee`       | Bots: flee a carrier within (dash ranges)  | 0.5–4 × (step 0.25)   | 2       | bomb  | now        |
| `botMiddlePull` | Bots: bend towards the middle when fleeing | 0–1 share (step 0.05) | 0.6     | bomb  | now        |

## Rotation

| Key         | Setting | Range                                                                                     | Default | Modes            | Applies    |
| ----------- | ------- | ----------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- |
| `rotation1` | Match 1 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | Sumo    | sumo, hill, bomb | next match |
| `rotation2` | Match 2 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | off     | sumo, hill, bomb | next match |
| `rotation3` | Match 3 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | off     | sumo, hill, bomb | next match |
| `rotation4` | Match 4 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | off     | sumo, hill, bomb | next match |
| `rotation5` | Match 5 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | off     | sumo, hill, bomb | next match |
| `rotation6` | Match 6 | off / Sumo / Sumo · Points / Sumo · Last One Standing / King of the Season / Halving Bomb | off     | sumo, hill, bomb | next match |

## Numbers in game-core that are not settings

- `FIELD_SIZE`: the coordinate space the wire carries (u16 positions), not a play size
- `SPAWN_TRIES`: how hard the respawn spot search looks, not a rule
- `GOLDEN`: a mathematical constant that spreads wander points
- `GOLDEN_ANGLE`: a mathematical constant that parts ghosts sharing one point
- `MAX_SUB_STEPS`: a bound on the work of a stalled tick
- `TICK_MS`: the bots' perception granularity, the server's tick
- `SIM_TICK_MS`: the simulation's step, the server's tick
- `TOUCH_SLACK`: a numerical tolerance: two touching ghosts lie exactly two radii apart
