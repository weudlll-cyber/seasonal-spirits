# Seasonal Spirits — Concept

**Status:** concept phase closed 2026-11-14. This file is the English reference for the
repository, derived from the owner's concept document v4.6 (German, kept by the owner). It
changes only from the results of Phase 0 (network probe) and the fun gate (first evening with
the community), not from further discussion rounds.

Seasonal Spirits is a real-time team game for the Seasonal Entertainment community. Four teams,
named after the four Seasonal Tokens (Spring, Summer, Autumn, Winter), move their ghosts live
on one map and compete for coins in a five-minute match.

## 1. Purpose

Seasonal Entertainment exists to bring people without crypto knowledge into the Seasonal
community through shared fun. Seasonal Spirits is its first game with real graphics that the
players steer themselves. Three rules follow from this purpose (decided 2026-11-14):

1. **No crypto needed.** No wallet, no token, no price, no jargon in the game. A player signs
   in with the website account and plays.
2. **The game teaches the Seasonal idea by playing, not by explaining.** After a few evenings
   a player knows the four names and their order, that each has its moment, that you hold the
   one that is in season, swap it before the turn, and that every turn of the season is a
   halving after which the old season's coins are worth half. That is how Seasonal Tokens
   work; nobody told them.
3. **The bridge is voluntary and comes afterwards.** After the match, one box on the result
   screen explains that what was just played is how Seasonal Tokens work, with a "Start here"
   button to the website's path for newcomers and a "Try the simulator" button to
   seasonaltokens.org, and the note "No financial advice" below. Switchable off in the
   configuration; on by default.

## 2. The core: hold, swap, secure

The real Seasonal Tokens rule: four tokens, each nine months "in season", produced fastest
then; order Spring → Summer → Autumn → Winter → Spring. Swap tokens only for more tokens of
another kind: hold the token in season, swap it into the next one when its value has risen.
Production of each token halves every nine months. Patience is rewarded.

Seasonal Spirits compresses the three-year cycle into five minutes. A match runs through the
four seasons in the real order, 75 seconds each, starting with the season the tokens are
really in right now (the website's season clock provides that).

### 2a. The mechanics in five sentences

1. **Coins lie on the field, always only those of the current season.** In Spring, Spring
   coins. (Mirror: the token in season is produced fastest.)
2. **A coin is worth its full value when secured in its own season; outside it, half.**
   (Mirror: the price rises in season.)
3. **At the team's own shrine a player can swap carried coins: from 6 coins of the current
   season on, every 2 become 3 of the next season (6 → 9, 10 → 15), never in the last
   season.** Those are worth half now, full when their season comes, and nobody can steal
   them until the next halving. (Mirror: swap for more tokens of another kind; patience
   pays.)
4. **Or secure: bank now, at the current value, and nothing can happen to them any more.**
   Securing takes 2–3 seconds; the player is vulnerable meanwhile.
5. **Whoever carries can be robbed and loses a random part, at least one coin.** That is the
   market risk. A carrier is visible: larger, brighter, with a trail and a name; a carrier of
   swapped coins shows a shield.

A patient player who swaps every season and is never robbed turns 10 coins into 15, then
22, then 33. A cautious one secures early and has little, but safely. A hunter collects
little and takes it from the carriers. All three are valid; the clock decides which is wise.

Starting values (decided 2026-11-14, both configurable): swap 10 → 15 of the next season;
half value outside the coin's own season. Adjusted on 2026-11-16 (section 14): the swap from
6 coins at the same rate, swapped coins steal-proof until the next halving, a random steal
share.

### 2b. The halving

In reality every change of season is a halving, and the game does the same (decided
2026-11-14, afternoon; section 13):

- **Every season change inside a match is a halving** — in a 5-minute match at 1:15, 2:30
  and 3:45, generally at every season boundary before the match end. The match end itself
  is not one.
- **At a halving the old season's coins stop falling and the new season's coins fall from
  then on.** Old coins still lying on the field disappear. Each season's coins look
  different (the season's own colour now, the real token logo later). The spawn rate stays
  the same.
- **Carried coins are not halved.** A carried coin of a season that is no longer current is
  worth half (the value rule of 2a), so every halving is a deadline: secure or swap before
  it. (Mirror: the token that leaves its season loses its premium; the patient holder has
  already swapped into the next one.)

The halving is staged, not just computed, at every season change: a **countdown** on the
season clock from 10 seconds before, for players and spectators alike; a large on-screen
**announcement** ("HALVING — Summer is in season", with the new season's name) at the cut; a
**short flash**, the new season's coins starting to fall and every carrier's old-season coins
visibly switching to a "half value" look; and **one recognisable tone** — the only sound
Phase 1 needs. The countdown is part of the mechanics: it makes the deadline visible to
newcomers who cannot read the clock yet. Cheap (a server timestamp plus a client effect), so
it belongs in Phase 1.

Dropped with this decision: halving of carried coins, the centre pool ("Great Halving
Loot"), the halved spawn rate after the halving, and the single halving moment at 3:45.

### 2c. The four rule changes from earlier drafts

"Loot grows", "centre shrine", "whole loot", "frost" are not dropped but moved: Phase 3, as
switchable "season specials" for special evenings, off by default. Phase 1 has one rule set a
newcomer understands within one match.

## 3. Why it works for people without crypto knowledge — and where it can fail

Works because: the rules fit in five sentences; the vocabulary is the real one (Spring,
Summer, Autumn, Winter, in season, halving, swap) with no game vocabulary to unlearn later;
zero entry hurdle (website account, Discord optional, a phone is enough); watching is the
step before playing.

Fails if: the game preaches crypto (hence the bridge only after the match, one sentence, one
button); the swap mechanics demand too much thinking (hence two labelled buttons at the
shrine, "Secure (10 now)" and "Swap (15 Summer, worth 7 now / 15 later)" — the player reads,
never calculates); the phone fails (the largest unverified weakness; Phase 0 and the fun gate).

## 4. Fixed decisions

- Real game action, live movement, **32 players per match**.
- Four teams named after the tokens, real logos and original colours; game values independent
  of market prices; all teams fair.
- **Embedded only** in Seasonal Entertainment (decided 2026-11-14, replacing the earlier
  "standalone and embedded"): login, player data and chat come from the website; the game has
  no account system of its own. A local development mode with fake players, without login,
  serves development and Phase 0.
- English in source, documentation and UI. Source hygiene, security and tests as in the other
  projects of the ecosystem.
- Configuration files first, an admin panel later.
- No permanent season loyalty in the community; the cycle matters more than a community war.
- Primarily an **event game**; community evenings are the core.
- **5 minutes** as the starting value, configurable. The big event is called **Halving**.
- Purpose: bring people from the Web2 world into the Seasonal world (2026-11-14).

## 5. The game evening

**The unit is the evening, not the match.** The host creates a game evening in the website's
event calendar (default: 6 matches of 5 minutes plus breaks ≈ 60 minutes) with one sign-up
list, rotation between matches, an evening score (secured value per player, team of the
evening), a call and a recording. The evening lives in the database and survives a restart;
**a single match does not** — it then does not count and is repeated.

**Teams are assigned.** Without loyalty, free choice gives 14 against 4. Players state a wish
(or "any") when signing up; the evening assigns equal sizes and rotates.

**Spectators: watch first, a prediction maybe later.** Spectators see the match in a view of
their own and hear the commentary in the call. Phase 1 builds only that. A spectator
prediction (pick the winning team before each match, counted into the same seasonal ranking,
smaller) is noted as an option for Phase 2 — only if the first evening with a call shows that
spectators leave without a stake of their own (decided 2026-11-14).

## 6. Long-term motivation: 100 evenings

A five-minute game without a progression system holds nobody for 100 hours; the goal is 100
evenings. What brings people to the 50th evening: mastery on one fixed map; the ritual with
call and recording; being seen (player of the evening in the weekly review, a home-page box,
a shareable link); **one** ranking per meteorological season as in Mini Games. Deliberately
not built: cosmetics, experience levels, daily quests. The strongest reason to come back is
that on the second evening a newcomer already understands what the regulars are saying — and
that is the same language as the token community's.

## 7. Dropped

- Wind, fog, new paths, ghost storm, coin rain, frost wave, great harvest as events of their own
- Community polls and global team statistics inside the game (the website has chat, polls,
  rankings); a **team chat** is not in Phase 1 — whether and how it comes is decided after the
  first game evening (section 12, point 1)
- A foundation of our own for future games (exists in the website, Bingo, Mini Games)
- Four animation sets for season accessories (colour is the information)
- A second core mechanism, beginner groups, reduced losses for beginners, variable map areas,
  several meta layers
- A running match surviving a restart
- The four rule changes in Phase 1 (→ Phase 3, switchable); any crypto explanation inside the
  game; any wallet connection; token prices in the game; prizes with monetary value
- Own login, registration, password recovery, two-factor, a standalone installer branch —
  everything a standalone operation would need (2026-11-14)

## 8. Controls, graphics, technology

**Controls:** virtual joystick (phone) or WASD/mouse (PC). On the field **one** action
button: steals automatically from the nearest opponent in range — no aiming. At the team's
own shrine the same spot shows **two labelled buttons**: "Secure (value now)" and "Swap
(count next season, value now / later)". Carrying slows a ghost down. Reconnect: 10–15 s as a
standing ghost, then a bot.

**Graphics:** simple ghosts in the four token colours; carried coins visible as size, glow,
trail and name; **the coins carry the real token logos** — that is where the logos belong,
not as decoration at the edge. The map changes colour and light with the season; the season
clock at the top shows the four symbols in order, the current one highlighted, the next
announced. Effects in three levels. Priority: readability > recognisability > performance >
beauty. Colours, font and light/dark theme come from the website's `docs/DESIGN.md`; the
single source of values there is `client/src/styles/tokens.css` (Spring `#AFB84E`, Summer
`#E06E22`, Autumn `#F9A825`, Winter `#04AAF7`; Luxora Grotesk, headings Bold).

**Technology:** the server is the only truth; clients send inputs, never positions ·
15–20 Hz, the client interpolates · circles and rectangles, no physics engine · WebSockets
first, WebRTC only if Phase 0 demands it · a spectator is a client without inputs · no
interest management at 32 · runtime as the other projects of the ecosystem (Node ≥ 22,
TypeScript, pnpm) · the client framework (Phaser or other) is decided **after** Phase 0; Phase
0 draws with Canvas · the load risk of match server plus call server on one VPS is measured in
Phase 0.

**Embedding and hosting (decided 2026-11-14):** the game server is a process of its own on
its own port, never part of the website. The front door is the website at
`stentertainment.net/games/seasonal-spirits`; its nginx asks the website who is signed in and
forwards requests and the WebSocket to the game server — exactly the website's documented
pattern (`docs/GAME-INTEGRATION.md`, `docs/AUTH.md` "Embedded games", `docs/DEPLOYMENT.md`
"Embedded games" in `weudlll-cyber/seasonal-entertainment`). Two deviations from the Bingo
route file, needed for moving the game to another server: the game server's address is a
configuration line (Bingo's points at the local machine), and a game server on another
machine reaches the website's account-changes feed (reachable only on the website's local
port) through a private link between the two servers (WireGuard or SSH tunnel). Both are
configuration, no code change on the website. Initially everything runs on one VPS as with
Bingo.

**Bridge after the match:** result screen, below it a box: "This is how Seasonal Tokens work:
hold the season, swap before it turns, expect less after the halving." Two buttons: "Start
here" (the website's path for newcomers) and "Try the simulator" (seasonaltokens.org). Below:
"No financial advice". Switchable off in the configuration.

## 9. Order of work

**Phase 0 — network probe.** 32 bots, an empty map, artificial delay 100–200 ms, in parallel a
website call with test listeners on the same VPS. Success criteria: 20 Hz with 32 bots under
30 % of one core · state message under 1 KB · no visible jumps at 150 ms. The result is
numbers. Decision: continue, change technology, or change the concept.

**Phase 1 — the game with its core.** One map, four teams, website login with player data from
the website, **one** embedded website chat room (slug `seasonal-spirits`), season clock, coins of
the four kinds with value by season, hold / swap / secure, stealing, a halving at every season
change (with countdown, announcement, effect and one tone), 5-minute match, spectator view
(no prediction), bots, practice match, bridge box, configuration file.

**Fun gate.** One evening with the owner and members in a call. One question: does the game
carry? No ⇒ change the core, do not decorate. Yes ⇒ continue. (The gate tests the game, not
knowledge about tokens; no mandatory testers without crypto knowledge — decided 2026-11-14.)

**Phase 2 — the game evening.** Event calendar, sign-up list, assignment, rotation, evening
score, seasonal ranking, recording, player of the evening, home-page box, weekly review.

**Phase 3 — refinement.** Season specials (the four rule changes, switchable), a few fixed
extra maps, commentator view, admin panel UI, better bot behaviour, special formats.

## 10. Owner decisions of 2026-11-14 (concept, all seven decided)

1. Core: hold / swap / secure by the real token rule; the four rule changes become switchable
   Phase 3 specials.
2. Starting values: swap 10 → 15 of the next season; half value outside the own season; both
   configurable.
3. Halving: staged with countdown, announcement, effect and one sound. Its mechanics were
   replaced on the afternoon of 2026-11-14 by section 13 (every season change is a halving;
   carried coins keep their count; no pool, no halved spawn rate).
4. Bridge box after the match with "Start here", simulator link, "No financial advice";
   switchable, on by default.
5. Fun gate tests the game, not knowledge; no mandatory testers without crypto knowledge.
6. Spectator prediction not in Phase 1; spectator view only; prediction as a Phase 2 option
   if the first evening shows it is needed.
7. Own repository `seasonal-spirits`, own Claude Code session (the "standalone and
   embedded" part is replaced by section 12, point 3).

## 11. Closing word of the concept phase

The open questions can no longer be answered at the desk. What is missing comes from real
players, real matches and real measurements: Phase 0 (network) and the fun gate (one evening
with a call). This document stays the reference until the fun gate shows otherwise.

## 12. Owner decisions of 2026-11-14 on the embedding in Seasonal Entertainment

Four points that came up at project start. The proposals were made after reading the
website's integration documentation (`weudlll-cyber/seasonal-entertainment` at commit
1fac68e: `docs/GAME-INTEGRATION.md`, `docs/EMBED.md`, `docs/AUTH.md` "Embedded games",
`docs/DEPLOYMENT.md` "Embedded games", `docs/SCALING.md`, `docs/DESIGN.md`; Bingo's route
file `ops/lib/websiteRoute.sh` at f655df9). All four were accepted.

1. **Chat: one room in Phase 1.** The game embeds the website chat in **one** room (slug
   `seasonal-spirits`), following the snippet in `docs/EMBED.md`. The website creates one room
   per game, not per match, and has no room membership a game could drive, while teams are
   assigned per evening and rotate. A team chat would therefore be either a new website
   feature or an in-game chat; **both are decided only after the first game evening**, and
   nothing is built for it before.
2. **Player data from the website only.** No user table of our own, no passwords. Per sign-in
   the website delivers through the nginx authorize path: id, display name, role, "may host
   this game", Discord steps (`docs/AUTH.md`, header table). The account key in the game is
   (website origin, website user id) as `docs/GAME-INTEGRATION.md` §3 requires; the game
   stores game data only (results, evening scores, rankings). Account changes arrive through
   the website's account-changes feed: locked or rights changed ⇒ game session ended; deleted
   ⇒ "Deleted player", points kept in past rounds, gone from the ranking; renamed ⇒ new name
   from the next sign-in.
3. **Embedded only.** No standalone operation, no own login. The website documentation so far
   requires both modes of embedded games (`docs/GAME-INTEGRATION.md` §1, decided 2026-11-04);
   Seasonal Spirits is the first exception and is to be noted there as such (one paragraph, a
   task for the website's session before Phase 1). What remains: a local development mode
   with fake players — the `local` mode without a login system. Licence stays AGPL.
4. **Hosting: own process, website as front door, movable by configuration.** Described in
   section 8 ("Embedding and hosting"). Path `/games/seasonal-spirits`, slug `seasonal-spirits`.

5. **Name (2026-11-14):** the game is called **Seasonal Spirits** (formerly "Season Spirits"),
   everywhere: repository `seasonal-spirits`, path `/games/seasonal-spirits`, slug and chat room
   `seasonal-spirits`.

**Resulting tasks for the website's session (due before Phase 1, not before Phase 0):** the
slug `seasonal-spirits` in the fixed list (`server/src/games/embedded.js`), the installer
question (`deploy/install/lib/games.sh`), the feed denial (`deploy/site/Caddyfile`), tests;
the "embedded only" exception note in `docs/GAME-INTEGRATION.md`.

**Noted for Phase 1, not decided:** where the call runs that spectators hear (section 5). The
website documentation tells games not to assume embedded calls (`docs/GAME-INTEGRATION.md`
§8); for Phase 0 a normal website call in parallel to the probe is enough.

## 13. Owner decision of 2026-11-14 (afternoon): halving = season change

Replaces the halving mechanics of section 2b and decision 3 of section 10; the staging stays.

1. Every season change inside a match is a halving: at 75 s, 150 s and 225 s of a 5-minute
   match, generally at every season boundary before the match end. The match end is not one.
2. At a halving the old season's coins stop falling and the new season's coins fall from
   then on; old coins still on the field disappear. The coins of each season look different
   (each season's own colour now, the real token logo later). The spawn rate stays the same.
3. Carried coins are not halved. A carried coin of a season that is no longer current is
   worth half (the existing value rule), so every halving is a deadline: secure or swap
   before it.
4. The old mechanics are removed completely: halving of carried coins, the centre pool, the
   halved spawn rate, the single halving moment.
5. The state carries a countdown during the 10 s before every season change and a one-tick
   halving event carrying the new season, each time.

The unchanged spawn rate in point 2 was added by the planning side, not by the owner; the
balance simulation checks it.

## 14. Owner decisions of 2026-11-15/16: the fair rules

Measured in balance rounds 4–7 (`docs/BALANCE.md`): with these rules each of the three styles
(patient, cautious, hunter) has the best player of a match in 25–42 % of matches, on two
separate sets of 300 seeded matches.

1. **Swap from 6.** From 6 coins of the current season on (placeholder), all of them swap at
   10 → 15, rounded down (6 → 9, 8 → 12, 10 → 15); no swap in the last season.
2. **Swapped coins are safe until the next halving.** What a swap gives cannot be stolen until
   the next season change or until it is secured. The ghost shows a shield while it carries
   such coins.
3. **A random steal share.** Each steal takes a share drawn anew between 0 and ½ of each
   season's stealable coins (placeholders), rounded up, at least one coin.
4. **No escort rule.** The trial rule "a carrier with a teammate close by cannot be robbed"
   is removed; it handed the game to the hunters.
5. Coin spawn stays at 2 per second.
