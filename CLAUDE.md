# Working rules for Claude Code sessions

These rules apply to every Claude Code session in this repository.

## Language

- English in source, comments, documentation, UI, commit messages, backlog, reports — every
  line that lands in the repository. The owner's concept document is kept separately in
  German; the English reference is [CONCEPT.md](CONCEPT.md).

## Source hygiene

- Every source file starts with a short header comment: one line what the file is, one line
  why it exists in this package.
- Inline comments at the places that matter — the server loop's drift correction, the delay
  queue's order rule, the jump detector's threshold, the halving event. Not elsewhere.
- No dead code, no unused variables, no leftover `console.log` in a merged commit. The lint
  rule for unused variables is `error`, not a warning.
- No files touched "just because".
- Before writing any helper, function, type or constant, search the whole tree for an
  existing one and reuse it; nothing is built twice. Every report names what was reused.
- Keep files short and single-purpose; split a file before it grows past one concern.
- Every change carries its docs, header comments, inline comments and line references
  along in the same commit.
- Reports list files touched with line counts before/after, what was removed, what was
  moved out, and anything noticed but left untouched.

## Server, clients, trust

- The server is the only truth. A client sends inputs, nothing else. A position from a
  client is ignored on sight.
- There is no "bot" protocol. A bot is a normal WebSocket client the server does not know
  anything special about.
- Spectator clients send nothing after their first message. The server enforces this.

## Security

- Validate every input at the boundary (WebSocket messages, HTTP parameters, headers,
  environment, files): type, range, length, rate. Reject or ignore anything else; never
  trust a client value for position, count, value, team, role or time.
- Secrets (proxy secret, sync token, session keys) come from configuration or files
  outside the repository, never from source, never in logs, reports, error messages or
  browser responses; compare them in constant time.
- Identity comes only from the website's sign-in route as documented in
  `weudlll-cyber/seasonal-entertainment` `docs/GAME-INTEGRATION.md`; no local accounts, no
  passwords in this game ([CONCEPT.md](CONCEPT.md) section 12).
- Cookies HttpOnly, Secure (outside development), SameSite=Lax, scoped to the base path;
  CSRF protection on every state-changing request.
- Bounded everything: message sizes, queues, maps keyed by client data, timers.
- Dependencies: only well-maintained packages, pinned versions, no install scripts from
  unknown packages; justify every new dependency in the report.
- Personal data stays out of the repository: no e-mail addresses, names of real people,
  IP addresses or machine paths in committed files.
- Dev-only modes refuse to start when `NODE_ENV=production`.

## Documents

- Documents and the backlog are updated in the same commit as the code they describe. A
  commit that lands code without the matching doc change is incomplete.
- `docs/BACKLOG.md` has three parts: OPEN (what has to be done next, each with what "done"
  means), CLOSED (what the session finished, with the commit) and CHECKS DONE (every check
  that ran, see "Checks"). Rewrite OPEN completely as reality changes; append to CLOSED and
  CHECKS DONE.

## Branches, pushes, merges

- `master` is the integration branch. Work lives on a phase- or feature-named branch
  (`phase0/network-probe`, …). One problem per branch; a branch exists until its problem is
  solved or the owner decides to drop it.
- Always push. The pushed tree is how the owner sees the work. Commit at least every 45
  minutes with a heartbeat note when a long piece is in progress.
- Merges to `master` need the owner's explicit word. No self-merging. No force-pushes, no
  rebase of pushed history, no `commit --amend` on pushed commits — even without those bans,
  they would lose the owner's view of what happened.

## Tools

- One command per shell call. Chained commands with `&&`, `;` or `|` match no allow rule in
  `.claude/settings.json` and are denied. A single-tool pipe is fine where a single tool
  needs it.
- Long-running processes (servers, watchers) start detached with
  `powershell -NoProfile -Command Start-Process ... -WindowStyle Hidden` on Windows and the
  equivalent on Linux. Stop them by port when the step is done, unless the handover wants
  them running.
- `.claude/settings.json` is edited only when a task names the change and the owner
  approves the prompt; never in an unattended run. `.claude/settings.local.json` is never
  edited or committed.

## Tests

- Unit tests fast: the whole unit suite under 30 s. Long measurements belong in `tools/probe`
  and run on demand, not in `pnpm test`.
- Logic that depends on time takes a clock; tests use a fake clock. A test that sleeps is
  wrong.
- Coverage should be as high as is meaningful: every rule of the game, every input check,
  every security decision and every bug fix gets a test that would fail if the behaviour
  broke.
- There is no coverage percentage target and no coverage gate in CI. Never write a test
  only to raise a number: no tests of trivial getters, no tests that assert what the code
  literally says, no snapshot tests without a reason.
- A test names the behaviour it protects; when it fails, the name says what broke.
- Coverage may be measured to find untested logic; the report then names the gaps and why
  each one matters or does not.

## Checks

- Before any check, ask: can this change have altered the answer? If not, do not run it.
- Before running any check, look in `docs/BACKLOG.md` part three (CHECKS DONE); if the same
  check already ran with the same result-relevant input (same tree, or a later tree whose
  diff cannot affect it), do not run it again and cite the existing row instead.
- After running a check, add its row to CHECKS DONE in the same commit as the work it
  verified. A topic moves from OPEN to CLOSED in the same commit that finishes it.
- Local checks cover only what changed since the merge base with `origin/master`
  (committed and uncommitted): format and lint on the changed files, typecheck, and only
  the tests related to the changed source files. Use `pnpm verify:changed`.
- Documentation-only or report-only changes run no tests and no typecheck; format check
  on the changed files only.
- Never re-run a check on an unchanged tree (same commit, or a merge whose tree equals the
  branch head).
- The full suite runs in GitHub Actions on every push, not on the owner's PC. Run the full
  `pnpm verify` locally only to reproduce a CI failure.
- Long measurements (probe runs) only when a task asks for them.
- Keep reading cheap: use `git diff`, `git log --oneline`, `grep` and targeted line ranges
  instead of re-reading whole files or whole logs.
