# Security checks

What runs automatically, where its results appear, and what only the owner can switch on.
The rules for the code itself are in [CLAUDE.md](../CLAUDE.md) ("Security"); what a
cheating or broken client can try, and the test for each answer, is in
[THREATS.md](THREATS.md).

## Automated checks

| Check                 | Covers                                                                                                                      | Runs                                                                      | Results on GitHub                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CI `verify`           | Format, strict typed lint, typecheck, all unit tests (`pnpm verify`)                                                        | Every push to every branch and every pull request to `master`             | Actions → CI; the check on the commit and the pull request                                      |
| CI `dependencies`     | osv-scanner against `pnpm-lock.yaml`: any known vulnerability fails the job unless `osv-scanner.toml` has a dated exception | Same as CI `verify`                                                       | Actions → CI → job `dependencies` (the log lists every finding with its advisory)               |
| CI `e2e`              | The browser specs (Playwright, desktop and phone) on stacks of their own                                                    | Same as CI `verify`                                                       | Actions → CI → job `e2e`; on a failure the traces of the failed tests, kept a week              |
| CodeQL                | Static analysis of the JavaScript and TypeScript source (injection, unsafe data flow, prototype pollution and the like)     | Every push, every pull request to `master`, and weekly (Monday 04:23 UTC) | Security → Code scanning; the CodeQL check on the commit and the pull request                   |
| Renovate              | Update pull requests: weekly, minor and patch grouped; security fixes at once; never merged automatically                   | Weekly, and at once for a security advisory                               | Pull requests from Renovate; its "Dependency Dashboard" issue. Needs the Renovate app installed |
| pnpm install policies | Releases younger than one day are refused; install scripts run only for packages allowed in `pnpm-workspace.yaml`           | Every `pnpm install`, locally and in CI                                   | The install step's log                                                                          |

An exception in `osv-scanner.toml` carries the advisory id, an `ignoreUntil` date and the
reason; it expires and is reviewed again (now one: `picomatch`, GHSA-fc5q-39xc-vjpf, until
2027-01-18, BACKLOG "ab"). Transitive fixes are forced in
`pnpm-workspace.yaml` under `overrides`, each with its advisory, and removed once the parent
ships the fix.

## Settings only the owner can switch on

These are repository settings on GitHub. A session does not change them.

1. **Secret scanning with push protection.** Settings → Code security → Secret Protection:
   enable it and "Push protection". A push that contains a recognised secret is then
   refused before it lands.
2. **Branch protection for `master`.** Settings → Branches (or Rules → Rulesets): require a
   pull request, and require the status checks `verify`, `dependencies` and `analyze`
   (CodeQL) to pass before merging; block force-pushes and deletion. Note: CI skips pushes
   that change only Markdown under `docs/` or `reports/`; a required check on such a pull
   request then stays pending.
3. **Copilot code review on pull requests.** Settings → Copilot → Code review (or a ruleset
   "Request pull request review from Copilot"): automatic review of every pull request.

## The game's WebSocket

Only the pages the game is served from may open it (owner decision 2026-11-22, DECISIONS D2;
`apps/server/src/origin-guard.ts`): the client's address on this machine, in the LAN mode this
machine's home-network addresses, in website mode the website's origin from `WEBSITE_ORIGIN`.
Any other or a missing `Origin` gets 403. Like the admin check below, this stops other pages in
a player's browser, not a program that writes the header itself; the per-address and total
bounds still hold for those. A client that stops reading is closed once it holds 256 KiB unsent
(`client-record.ts` `sendWithin`), so no client can grow the server's memory (THREATS rows 21b,
21c).

## Development-only openings

What the dev server opens beyond this machine, and only in development (the server refuses to
start with `NODE_ENV=production`; the rules are tested in `apps/server`):

- **`pnpm dev --lan`** binds the match server and the client to `0.0.0.0`, so a phone in the same
  Wi-Fi can play (`env.test.ts`).
- **The admin panel from a phone** (owner decision 2026-11-21): in that LAN mode the admin
  endpoint also takes callers from the home network — RFC 1918 addresses only (10/8, 172.16/12,
  192.168/16, also IPv4-mapped) — and only from the panel's page on one of this machine's own
  home-network addresses, read from its network interfaces (`home-network.ts`,
  `admin-settings.ts` `adminAccess`; `home-network.test.ts`, `admin-settings.test.ts`). Without
  the LAN mode it stays loopback only; a public caller gets 404, another page 403. The `Origin`
  check stops other browser pages, not other programs: a device in the home network that writes
  the header itself can call the endpoint in the LAN mode (audit 2026-11-22, P1). The game's own
  admin login replaces this check before the endpoint leaves development (docs/THREATS.md row
  39).

## Security passes

**2026-11-21/22, second night chain, piece 8** (on `proto/sumo` at `827880c`):

- CodeQL and CI `dependencies` (osv-scanner) green on `21f3b29`, the last code commit before the
  pass. The alert list itself was not read: `gh api` is not allowed in an unattended session, so
  open alerts under Security → Code scanning are for the owner to look at.
- `pnpm audit`: no known vulnerabilities.
- Secrets over the whole history (gitleaks is not installed on this PC, so `git log --all -G`
  with its common patterns — cloud and GitHub tokens, private keys, chat and API keys — and the
  game's own secret names assigned a literal): no match.
- Personal data: this PC's real home-network address stood in the LAN rule's tests, in
  `SERVER.md`, in a BACKLOG row and in the first night report; replaced by example addresses
  (`192.168.1.20` for this machine, `192.168.1.30` for a phone). Earlier commits keep it, since
  pushed history is never rewritten.
- The dev-only openings: the admin endpoint refuses production with and without the LAN rule;
  the client's "Admin" link only in Vite's `serve` with `DEV_TUNING=1` and never with
  `NODE_ENV=production` (`vite/dev-admin.ts`); `/viewer/` and `/admin/` only on the dev server
  (`vite/viewer-pages.ts`, `apply: 'serve'`); the client's LAN mode refused with `NODE_ENV=production`
  (`vite.config.ts`), the match server refusing it altogether (`main.ts` `refuseProduction`).
- The embed: website mode is a build constant (`WEBSITE_MODE=1`), not a URL parameter; the
  docked chat is the kit's `WebsiteChatFrame` for the fixed room `seasonal-party`, always sandboxed (the kit's own rule since v0.9.0); no
  message listener in the game.
- Noticed, left: `CLIENT_PORT` and `SERVER_PORT` reach the client's Vite config through `Number()`
  unchecked. A bad value fails loudly (`ERR_SOCKET_BAD_PORT`, or a socket that does not connect)
  and comes from the developer's own shell; the server's checked `envInt` lives in
  `apps/server`, and the client does not depend on the server package.
