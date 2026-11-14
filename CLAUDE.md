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

## Server, clients, trust

- The server is the only truth. A client sends inputs, nothing else. A position from a
  client is ignored on sight.
- There is no "bot" protocol. A bot is a normal WebSocket client the server does not know
  anything special about.
- Spectator clients send nothing after their first message. The server enforces this.

## Documents

- Documents and the backlog are updated in the same commit as the code they describe. A
  commit that lands code without the matching doc change is incomplete.
- `docs/BACKLOG.md` has two parts: OPEN (what has to be done next) and CLOSED (what the
  session finished, with the commit). Rewrite OPEN completely as reality changes; append to
  CLOSED.

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
- `.claude/settings.json` and `.claude/settings.local.json` are not edited from a session.

## Tests

- Unit tests fast: the whole unit suite under 30 s. Long measurements belong in `tools/probe`
  and run on demand, not in `pnpm test`.
- Logic that depends on time takes a clock; tests use a fake clock. A test that sleeps is
  wrong.
