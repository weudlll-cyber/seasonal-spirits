# Night-run recipe

A Claude Code session running unattended (`dontAsk` permission mode) uses this recipe.

## Before the session starts

- `CONCEPT.md` is up to date (the English reference of the owner's concept document).
- `.claude/settings.json` is the night-run profile: `Read/Edit/Write` under `./**`,
  read-only `Read/Glob/Grep` in the three sibling clones (`seasonal-bingo-royale`,
  `seasonal-mini-games`, `seasonal-entertainment` next to this folder), the shell-level
  tools listed one by one, destructive git / gh / rm operations in `deny`.
- The task for the night is in `night-task.md` at the repository root. This file is
  `.gitignore`'d — it never lands in the commit history.
- The owner leaves the machine; the session is unattended from here.

## What the session does

1. Reads `night-task.md` and `CONCEPT.md` completely before any tool call.
2. Works piece by piece. Each piece ends with a `git commit` + `git push`; a heartbeat
   commit every 45 minutes when a piece is long.
3. Writes the morning sheet at `reports/night-<YYYY-MM-DD>.md`. Sections: `DONE`,
   `RUNNING`, `OPEN`, `NEEDS OWNER`. The last two are rewritten completely every time, not
   appended to. The sheet is pushed after every piece.
4. One-off scripts live under `tmp/` (git-ignored) and are deleted at the end of the step
   that needed them.
5. No check runs twice on an unchanged tree; no probe runs for longer than 120 s; at most
   two runs per piece.

## Starting and stopping long-running processes

- Start detached on Windows:
  `powershell -NoProfile -Command Start-Process node -ArgumentList 'apps/server/dist/main.js' -WindowStyle Hidden`
- Stop by port:
  `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3930 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }"`

On Linux the owner's server uses `nohup … &` with the same idea; the detail is in
[PHASE0.md](PHASE0.md).

## Rules the session will not break

- `.claude/settings.json` and `.claude/settings.local.json` are not edited.
- No force-push, no `git rebase`, no `git commit --amend`, no `git reset --hard`.
- No merge to `master` without the owner's word.
- Tool calls follow the shape in `.claude/settings.json`; any chained command or wildcard
  that does not match an allow rule is denied and must be split into single calls.

## At the end of the run

- Morning sheet is final: `DONE` (with commits), `RUNNING` (the URLs), `OPEN`, `NEEDS
OWNER`.
- `git ls-remote origin` confirms the branches are on GitHub. Nothing is merged tonight.
- Server and viewer stay running on their configured ports; URLs are in the morning sheet.
