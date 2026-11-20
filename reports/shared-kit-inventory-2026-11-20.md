# Shared kit across games — inventory (2026-11-20)

A read-only study. Nothing was built and nothing was written in the other repositories. It
answers one question: how can every game (Bingo, Mini Games, Seasonal Party, later more) take
its shell, UI and platform parts from one place? Seasonal Party is this repository's game:
`apps/client/index.html:613`, `apps/client/src/start.ts:1`, BACKLOG OPEN z. It stays a
standalone game.

**What was read.** Committed state only, through `git fetch`, `git show`, `git ls-tree` and
`git grep` against these heads:

| Repository | Ref | Commit |
|---|---|---|
| seasonal-mini-games | origin/master | `93ed780` |
| seasonal-mini-games | origin/feat/rd-list-games | `95631bb` (fit rule O111) |
| seasonal-bingo-royale | origin/master | `c3b76c1` |
| seasonal-bingo-royale | origin/docs/fit-audit | `57a04e4` |
| seasonal-entertainment (the website) | origin/master | `df90fcf` |
| seasonal-spirits (this repository) | proto/sumo | `f8204a5` |

Paths below are relative to each repository's root. "MG" is Mini Games, "BR" is Bingo Royale,
"SE" is the website, "SP" is this repository. Line counts are `git grep -c ""` on the ref
above. The drift figures come from `git diff --no-index --numstat` between the two committed
files. "After prefix rename" means `sbr`/`smg` were made equal first, so what is left is
substance.

## 1. Inventory

### Workspace facts

| | BR | MG | SE | SP |
|---|---|---|---|---|
| Package manager | pnpm 12.14.0 (`package.json:7`) | pnpm 12.14.0 (`package.json:7`) | npm workspaces, no `packageManager` field (`package.json`) | pnpm 12.14.0 (`package.json:8`) |
| UI | React 19.3.1, Vite, TSX (`apps/web/package.json:16`) | React 19.3.1, Vite, TSX (`packages/ui/package.json:18`) | React 19.3.1, Vite, **JSX** (`client/package.json`) | **No framework**: Canvas 2D plus plain DOM, TS (CONCEPT.md §8) |
| UI package | `@sbr/ui`: raw source, no build step (`packages/ui/package.json:7-13`) | `@smg/ui`: same shape (`packages/ui/package.json:7-13`) | none (`@seasonal-entertainment/shared` is internal) | `@seasonal-spirits/render` (canvas) |
| Font | Luxora Grotesk (`packages/ui/src/fonts.css:13`) | Luxora Grotesk (`packages/ui/src/fonts.css`) | Luxora Grotesk (`client/src/styles/fonts.css:13`) | **Fredoka** via `@fontsource/fredoka` 5.3.0 (`apps/client/package.json:12`) |
| Season colours | SE's (`tokens.css`) | SE's | `#afb84e #e06e22 #f9a825 #04aaf7` (`client/src/styles/tokens.css:16-19`) | **its own**: `#9BD15A #FF8A3D #FFC23C #4CC2FF` (`packages/render/src/palette.ts:7`) |
| CI | `ci.yml` 229, `codeql.yml` 33, `release.yml` 89 | `ci.yml` 150, `browsers.yml` 54, `codeql.yml` 33 | `ci.yml` 264, `codeql.yml` 38 | `ci.yml`, `codeql.yml` |
| Visibility on GitHub | public | public | public | public (`gh repo list`) |

### Parts by repository

"—" means not found by grep on the ref above.

| Part | BR (path, lines) | MG (path, lines) | SE (path, lines) | SP (path, lines) |
|---|---|---|---|---|
| Design tokens | `packages/ui/src/tokens.css` 138: SE names and values plus arena tokens (:6-8) | `packages/ui/src/tokens.css` 168: same plus player marks, own tint, text steps (:19-29, :65-68) | `client/src/styles/tokens.css` 156: "the single source of design tokens" (:5) | `apps/client/index.html:16-37`: 11 own custom properties in `<style>`; canvas palette in `packages/render/src/palette.ts` 127 |
| Fonts | `packages/ui/src/fonts.css` 26 | `packages/ui/src/fonts.css` 26 | `client/src/styles/fonts.css` 51 | npm package `@fontsource/fredoka` |
| Motion | `packages/ui/src/motion.css` 114: `sbr-anim-*`, all off under reduced motion | `packages/ui/src/motion.css` 114: `smg-anim-*` | — (only `Disclosure.css:55,66-68`) | `packages/render/src/motion.ts` (canvas) |
| Base CSS | `packages/ui/src/base.css` 201: page glow, focus ring, pill buttons, 44 px fields, panels, chips | `packages/ui/src/base.css` 294: the same plus locked field, ± field, one-line name, hint (O97) | `client/src/styles/base.css` 235, `forms.css` 206 | `apps/client/index.html` (inline `<style>`) |
| Fit scaling | — on master. Audit on docs/fit-audit: `docs/concepts/fit-audit.md` 235, 588 combinations, 504 with findings (:1-15) | `packages/ui/src/useFit.ts` 50 (`fitCount`). On the branch: `apps/web/src/round/useFit.ts` 206 with `useFitScale`, `FIT_FLOOR = 0.6` (:33, :116); rule O111 in `docs/DECISIONS.md:119` | home page prose only (`docs/DESIGN.md:248-298`) | `packages/render/src/view.ts` (the canvas field), `apps/client/src/banner-fit.ts` 33 |
| Player marks | `.is-own` + hidden "(you)" (`apps/web/src/components/RankRow.tsx:49,76`); `is-me` in `WaitingRoom.tsx:62-65` | `packages/game-sdk/src/marks.ts` 56 (`tagOf` → `'you'`, :35-36), `packages/ui/src/PlayerMark.tsx` 34, `marks.css` 41 | — | `packages/render/src/own.ts` 191 (canvas ring and arrow) |
| Toggles | `apps/web/src/shell/ThemeToggle.tsx` 52; `DrawModeSwitch.tsx` 53 | `apps/web/src/shell/ThemeToggle.tsx` 52; `packages/ui/src/SignToggle.tsx` 32 | `client/src/theme/ThemeToggle.jsx` 22; `chat/ToggleButton.jsx` 27 | `packages/render/src/look-switch.ts` 25 (Light/Dark pill) |
| Disclosure | one `<details>` (`RecentEvents.tsx:55`) | `packages/ui/src/useDisclosure.ts` 54 (Escape, focus return) | `client/src/components/Disclosure.jsx` 50 + `.css` 70 | `apps/viewer/src/panel-fold.ts` 26 |
| Website sign-in | server `apps/server/src/http/routes/websiteSignIn.ts` 118, `auth/websiteIdentity.ts` 125; client `apps/web/src/account/WebsiteSignIn.tsx` 114 | server `websiteSignIn.ts` 123 ("Adapted from Bingo's", :19), `websiteIdentity.ts` 145; client `packages/ui/src/websiteSignIn.ts` 67 | the authorize route: `docs/AUTH.md:876-917`, `docs/GAME-INTEGRATION.md:89-178` | — (dev only, `apps/server/src/main.ts:2`) |
| Chat docking | `apps/web/src/shell/ChatDock.tsx` 166: side panel from 960 px, drawer on phones, website mode only (:5-15) | `apps/web/src/match/ChatDock.tsx` 151: below the round (O97, :5), opt-in `meta.chatDock` (`packages/game-sdk/src/module.ts:47`) | the chat itself: `client/src/embed/EmbedChatPage.jsx` 160, `embedProtocol.js` 70 | — (planned: one room, CONCEPT.md section 12 point 1) |
| Call-view slot | spec only (`docs/spec/01-game-design.md:387-392`) | spec only, about 320×180 at the docked strip's right end (`docs/spec/02e-game-mind-games.md:182`) | calls exist on the site only; games must not assume them (`docs/GAME-INTEGRATION.md:362`) | — |
| Focus / game bar | — (top bar `apps/web/src/shell/AppShell.tsx` 268, :66-90) | `apps/web/src/round/FocusBar.tsx` 138 (O46), `FocusShell.tsx` 166, `ResultBar.tsx` 48 | — | `apps/client/src/hud.ts` 152 (DOM HUD over the canvas) |
| Start card | — (`StartForm.tsx` 221, `host/CreateMatch.tsx` 295) | `apps/web/src/round/RoundIntro.tsx` 103 (season card) | — | `apps/client/src/start.ts` 36 + `packages/render/src/podium.ts` 116 |
| Result screen | `apps/web/src/components/FinalPlacement.tsx` 131, `Podium.tsx` 45 | `apps/web/src/round/ResultScreen.tsx` 183 + parts (239, 297, 269, 130) | — | `apps/client/src/result.ts` 192 |
| Back to the website | `AppShell.tsx:71-75` "← Seasonal Entertainment" | not checked | required for every game (`docs/GAME-INTEGRATION.md:296-312`) | — |
| Host / lobby / roles | `apps/web/src/game/Lobby.tsx` 210, `host/HostConsole.tsx` 248; roles in `db/migrations/0002_accounts.sql:59-70` | `apps/web/src/lobby/Lobby.tsx` 231, `match/HostMenu.tsx` 299; `MAPPED_ROLES` (`packages/contracts/src/http/integration.ts:41`) | per-game host grant `server/src/accounts/gameHosts.js` 62 | `apps/server/src/match-host.ts` 293 (the match loop, no lobby) |
| Admin with 2FA | `apps/server/src/auth/twoFactor.ts` 151, `totp.ts` 73; `apps/admin` an empty stub; concept `docs/concepts/admin-area.md` 153 (website mode uses the website's 2FA, :107) | `apps/admin/src/twofactor/TwoFactorPage.tsx` 161, `StepUp.tsx` 46; `apps/server/src/auth/twoFactor.ts` 193, `totp.ts` 99 | `server/src/twofa/gate.js` 53 and client pages | `apps/server/src/admin-settings.ts` 289, behind a dev-only access check (BACKLOG OPEN af) |
| Embed | site path behind a proxy; `apps/embed-loader` an empty stub | `apps/embed-loader/src/index.ts` 153 (iframe `embed.js`), `apps/web/src/embed/EmbedShell.tsx` 91 | games run at `/games/<slug>/`, same origin, not in an iframe (`docs/GAME-INTEGRATION.md:52-65`) | — |
| Settings schema | Zod `RulesetSchema` (`packages/contracts/src/config/ruleset.ts` 258) | `packages/game-sdk/src/settings.ts` 209 (`SettingDef` :86) | `server/src/settings/schema.js` 14 + groups | `packages/game-core/src/settings.ts` 118 + `settings-list.ts` 239 |
| Game runtime | match logic in `packages/domain` | `GameModule` (`packages/game-sdk/src/module.ts` 201); timing `'cooldown' \| 'phased'` (:34), no tick | — | 20 Hz server loop (CONCEPT.md section 9, Phase 0 success criterion) |

## 2. Duplicates and drift

MG was forked from BR: `docs/spec/04-software-architecture.md:16` says "Adopted from Bingo",
and :52 maps `@sbr/*` to `@smg/*`. Both copied the website's tokens by value
(`tokens.css:6-8` in each). Nothing is shared by reference anywhere.

| Part | Lines BR / MG | Diff BR→MG | After prefix rename | What differs in substance |
|---|---|---|---|---|
| `packages/ui/src/fonts.css` | 26 / 26 | +1 −1 | +1 −1 | the spec line in the header comment only |
| `packages/ui/src/motion.css` | 114 / 114 | +19 −19 | +1 −1 | nothing: class and keyframe prefix (`sbr-` vs `smg-`) and the spec line |
| `packages/ui/src/tokens.css` | 138 / 168 | +46 −16 | — | 51 names in both, **all 51 with equal values** in both themes. MG adds 18 (`--mark-1…8`, `--own-tint`, `--color-own-base`, `--color-winter-text`, `--color-success-text`, `--font-size-ball`; `--color-board-*` is BR's `--color-bingo-card-*` renamed) |
| `packages/ui/src/base.css` | 201 / 294 | +124 −31 | +103 −10 | MG: page glow moved from `body` to `html` (the fix for the hard edge on tall pages), disabled buttons recoloured instead of faded (T68), locked fields (O97), ± field, `.smg-one-line`, `.smg-hint` |
| `packages/ui/src/index.ts` | 14 / 26 | +18 −6 | — | BR is an empty shell; MG exports six helpers |
| `apps/web/src/shell/ThemeToggle.tsx` | 52 / 52 | +1 −1 | +1 −1 | one line |
| `apps/web/public/theme-init.js` | 28 / 28 | +1 −1 | +1 −1 | one line |
| `apps/server/src/http/routes/websiteSignIn.ts` | 118 / 123 | +77 −72 | +75 −70 | the same route, restructured |
| `apps/server/src/auth/websiteIdentity.ts` | 125 / 145 | +57 −37 | +53 −33 | MG adds a role and header handling |
| `apps/server/src/auth/twoFactor.ts` | 151 / 193 | +170 −128 | +170 −128 | MG adds step-up; effectively rewritten |
| `apps/server/src/auth/totp.ts` | 73 / 99 | +75 −49 | +75 −49 | rewritten |
| ChatDock (`shell/` in BR, `match/` in MG) | 166 / 151 | +132 −147 | +132 −147 | different placement (side panel or drawer vs below the round); same SE protocol |

Website ↔ games:

| Pair | Lines | Diff | Substance |
|---|---|---|---|
| SE `client/src/styles/tokens.css` → BR `packages/ui/src/tokens.css` | 156 / 138 | +48 −66 | 42 names in both; 41 equal, `--sidebar-background` runs 90° in BR, 180° in SE. SE only (14): banner, coin, logo, wash, sidebar width, chat launcher. BR only (14): bingo card, ball, durations, easing, `--font-size-small`, `--gutter`, `--content-width` |
| SE `fonts.css` → BR `fonts.css` | 51 / 26 | +12 −37 | SE declares more faces; BR only book and bold |
| SE `base.css` → BR `base.css` | 235 / 201 | +127 −161 | different files with the same look |

SP shares none of these files. Its look (Fredoka, own season colours, Sky Island palette) is
its own.

## 3. Game-agnostic or not

| Kind | Parts | Notes |
|---|---|---|
| **Unchanged for every game** | fonts (Luxora files and `@font-face`); the core tokens (the 51 equal names: colours, type, radius, spacing, hit target); `theme-init.js`; the Light/Dark choice and its storage; motion timing tokens; the chat embed host side (iframe URL `/embed/chat?room=&theme=`, origin-checked `postMessage` with `seasonal-chat` / `seasonal-chat-host`, SE `client/src/embed/embedProtocol.js:19-21`); the back-to-website link; website sign-in client helpers (`websiteSignInHref`, `signInAgain`, MG `packages/ui/src/websiteSignIn.ts`); the server side of website identity (proxy-secret check, header parsing, role mapping); TOTP | no game rule in any of them; the sign-in and TOTP code is security-critical, so it would be maintained once |
| **Shared with a per-game theme or slot** | base CSS (buttons, fields, panels, chips); motion keyframes (the names are game moments: ball, stamp, burst); fit scaling (the O111 floors are per game); player marks and the own tint; disclosure; game bar and result frame; chat dock placement; call-view slot | needs a theme layer: SP's "action" look has Fredoka, its own season colours and drop shadows (`apps/client/index.html:16-26`). The SE token comment asks for the season colours "exactly these wherever a token is shown" (`client/src/styles/tokens.css:14-15`), and SP's are not those |
| **Game-specific, stays put** | arena tokens (bingo card, board, ball); the game SDK (`GameModule`, phased timing); SP's canvas renderer, match loop, protocol, bots; each game's settings schema contents; lobbies and host consoles (each tied to its own match model and transport: Socket.IO in MG `apps/server/src/realtime/gateway.ts:4`, a raw WebSocket here) | the settings schema shape could be unified later; not now |

Framework split: BR and MG components are React TSX; SE is React JSX on npm; SP has no
framework. A kit that serves all of them needs **framework-free layers first** (CSS, plain TS
functions, server helpers). React components go in a separate entry with `react` as a peer
dependency, and SP would use only the framework-free layers.

## 4. Delivery options

The setup: Windows PC, pnpm 12 in the games, npm in the website, separate public repositories
under `weudlll-cyber`, CI per repository, Renovate configured in at least this repository. MG
and BR export raw TS and CSS with no build step (`packages/ui/package.json:7-13` in each), and
every consumer bundles with Vite.

| Option | How a game takes a version | Pros | Cons | CI cost |
|---|---|---|---|---|
| **A. Separate repo, git dependency pinned to a tag** (`"@seasonal/kit": "github:weudlll-cyber/seasonal-kit#v1.2.0"`) | the tag in `package.json`; the lockfile pins the commit | no registry, no token (the repos are public); works with pnpm and npm; Renovate can open one bump PR per game; raw source suits the Vite builds already in use | no build step allowed in the kit (pnpm blocks lifecycle scripts of git dependencies unless allowed — not checked on pnpm 12); consumers type-check the kit's `.ts` with their own strict settings; a subdirectory install needs pnpm's `path:` form (not checked) — simplest is one package at the kit's root | the kit's own CI (lint, unit, a token contrast test); per game one more fetch at install, cached by the pnpm store |
| B. GitHub Packages (npm registry) | semver range in `package.json` | real semver, `pnpm update` | installing needs a token even for public packages (GitHub docs, not checked here): a secret in every repo's CI and on the PC, an `.npmrc` per repo; a publish workflow | the publish job; a token secret per consumer |
| C. Public npmjs scope | semver | free, no token to install | publishing to the public registry under an npm account (2FA, provenance) is a new outward step for the owner | the publish job |
| D. git submodule | the submodule commit | pinned exactly, no registry | Windows and CI friction (`submodules: true`, detached HEAD), easy to forget an update, parallel sessions editing inside the submodule | checkout of the submodule in every job |
| E. Copy and sync with a drift check | a script copies files; CI fails on drift | no new mechanism | the duplication stays; it only becomes visible | a drift job per repo |

**Versioning in A** (and in B and C alike): the kit uses semver tags. A game moves only when
its own `package.json` changes, so a kit change never reaches a game until that game takes it.
A breaking change (a renamed token, a changed class) is a major tag. Renovate's PR is the
opt-in, and its merge needs the owner's word like any other merge.

## 5. Who owns chat and calls

**The website owns both.** A game embeds the website's chat in an iframe; the website does not
wrap games in an iframe (`docs/GAME-INTEGRATION.md:63-65`). The website owns "chat and
moderation" (:69). Games must not assume "embedded calls or per-match website chat rooms"
(:362). The embed token is refused for calls (`docs/EMBED.md:275`). Where the chat sits and
how large it is belongs to the game (`docs/EMBED.md:216,234,240`; BR and MG chose differently,
`docs/GAME-INTEGRATION.md:206-208`). The call-view slot exists only in the games' own specs;
the website defines no game-facing call contract (`docs/CALLS.md`, no hit for game, embed or
slot).

For the kit boundary this means:
- The kit carries the host side of the chat embed: the URL, origin checks, the
  `ready`/`unread`/`resize` and `visible`/`theme` messages (`docs/EMBED.md:192-203`), tested
  against the website's constants.
- Chat itself stays on the website.
- Dock layouts are a slot in the kit, with the placement chosen by each game.
- Calls stay out of the kit until the website publishes a contract. At most an empty, reserved
  slot.

## 6. Recommendation

**Option A**: one new public repository, `seasonal-kit`, consumed as a git dependency pinned
to a semver tag. It holds raw CSS and TS, no build step, in framework-free layers (CSS, plain
TS, server helpers) and a separate React entry.

**First parts to move** (most duplication, least risk):
1. `fonts.css` with the Luxora files: identical but for a comment.
2. The core of `tokens.css`: the 51 equal names. Each game keeps a small arena-token file.
3. `motion.css`: identical after the prefix, with a neutral prefix and the game moments kept as
   names.
4. `theme-init.js` and the theme storage: one line apart.
5. The website sign-in client helpers and the chat-embed host side: MG's
   `packages/ui/src/websiteSignIn.ts` plus the protocol constants.

`base.css`, the server sign-in and identity files, and 2FA/TOTP come next. They have drifted
by +53…+170 lines and need a reviewed merge first, because the sign-in and TOTP code is
security-critical.

**Migration order:**
1. Seed the kit from MG's files. MG is the superset: its `base.css` carries the later fixes.
2. MG adopts first, with the smallest diff.
3. Then BR.
4. Then SP, when it builds its website mode.
5. The website stays the source of the token values. Whether it consumes the kit (npm, JSX) or
   the kit checks against it in CI is an owner decision.

**What Seasonal Party takes from the kit** instead of building it:
- website sign-in, client and server;
- the chat embed host side and a dock slot;
- the back-to-website link;
- core tokens, fonts and base CSS for its DOM parts (HUD pills, help card, start and result
  screens, admin panel) under its own "action" theme layer;
- the fit-scaling logic for those DOM screens (not for the canvas, which `view.ts` fits);
- the admin login and TOTP once merged;
- the role mapping.

It does not take the game SDK, the lobbies or the React game bar unless the owner chooses
React for its shell. Its start card and result page take the kit's frame and tokens; their
scenes stay canvas.

**Action-game risk, only as it bears on the boundary:** MG's game SDK has no tick. Its games
are event-driven (`packages/game-sdk/src/module.ts:34`), timed by a scheduler that polls a DB
table (`apps/server/src/round/scheduler.ts:28,47-56`). SP runs a 20 Hz loop. So the kit must
stay a shell, UI and platform kit, and must not include a game runtime or transport. Seasonal
Party cannot run as a Mini Games module without a tick in that SDK, which matches the decision
that it stays standalone.

## Decisions for the owner

1. Delivery: option A (git dependency on a tag) or another.
2. Repository name and package scope for the kit (`seasonal-kit`, `@seasonal/kit` are
   placeholders).
3. Does the website consume the kit, or stay the token source the kit is checked against?
4. Seasonal Party's look: keep Fredoka and its own season colours as an "action" theme, or
   take Luxora and the website's token colours (`client/src/styles/tokens.css:14-15`).
5. Seasonal Party's shell: stay framework-free, or adopt React to reuse the game bar, result
   frame and disclosure components.
6. The class prefix for shared CSS (today `sbr-` / `smg-`).
7. Whether the server-side sign-in and 2FA go into the kit, with one reviewed merge of the BR
   and MG versions, or stay per game.
8. The call-view slot: reserve it in the kit now, or wait for a website call contract.

## Not checked

- pnpm 12's handling of git dependencies: lifecycle scripts and the `path:` subdirectory form.
- Whether GitHub Packages needs a token for public npm installs (taken from memory of its docs).
- MG's back-to-website link.
- BR `pnpm-workspace.yaml`, `.npmrc`, `vite.config.ts`.
- MG `games/registry`, `apps/web/src/live/socket.ts`, the full intent list.
- SE `docs/CHAT.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, the settings `groups/*` files.
- Branches other than those named above.
