# Session 2026-11-16-HUMAN — can a human collect coins against bots?

Branch `feat/human-feel` from `feat/night-2026-11-16` (not merged). Nothing merged, no config
default changed; every trial is a switch whose default is today's behaviour.

Owner's observations 2026-11-16 (playing the night branch against bots only): as a human it
is almost impossible to collect coins; groups of ghosts still form and dissolve late (a group
of about eight just below the own shrine, carriers with 6–7 coins).

**Working tree**: the permission rules refused a separate git worktree, so this session works
in the normal working tree on `feat/human-feel`. The running `pnpm dev` server keeps the night
branch's code in memory (no file watch); the client Vite serves may reload changed game-core
files — all of them default to today's behaviour. At the handover the working tree goes back
to `feat/night-2026-11-16` and `pnpm dev` restarts from it.

## The instrument (commit "feat: human round instrument, bot sight trials off")

- **Stand-in** (`packages/game-core/src/human/standin.ts`): takes seat 1; sees only a player's
  "Near" view, decides a reaction time late (300 ms, placeholder), collects the nearest coin
  it sees, secures at its shrine before every deadline. Never part of the balance pool.
- **The "Near" view, from the client's constants** (`cameraSpan` 1100 field units along the
  shorter side of the screen below the 104 px bar, render `follow`): a desktop window of
  1280 × 800 — and 1920 × 1080 alike — shows **2000 × 1100** field units (the whole field width,
  1100 of the height); a phone in portrait (Pixel 7, 412 × 915 CSS pixels) shows **1100 × 2000**.
- **Trial switches** (off by default; `packages/game-core/src/bots/perception.ts`): T1
  `bots.viewRadius`, T2 `bots.reactionMs`. T3 (fewer bot seats beside a human) is a parameter
  of the measurement only (`botSeats` in `human/round.ts`), not a server switch: the match
  host's fixed 32 seats would need a seat change at the match start; built only if chosen.
- **Equivalence**: with everything off, `pnpm balance --matches 30 --seed 1` gives exactly the
  night's piece 1 row (26.7 / 43.3 / 30.0 %, 8.7 swaps, 1304.2 steals, the same 39 125 steals).
- A `pickup` event per picked coin (`field.ts`) lets the round count pickups per ghost.

## Results

Running — see the next commit.
