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
