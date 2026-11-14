# What a cheating or broken client can try

Every entry: what a client can send or do, the server's answer, and the test that proves it.
The rules behind it are in [CLAUDE.md](../CLAUDE.md) ("Server, clients, trust" and
"Security"). Test files: `protocol` = `packages/protocol/src/client-message.test.ts`,
`server` = `apps/server/src/server.test.ts`, `routes` = `apps/server/src/http-routes.test.ts`,
`core` = `packages/game-core/src/*.test.ts`.

The wire protocol today carries hello and direction only. The shrine actions and the steal
arrive with the match server (piece C); their rules already live in the game core, which
refuses every invalid action itself, so the answers below hold whichever client sends them.

## Messages

| #   | A client tries                                                                   | The server's answer                                                                                                       | Test                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Text that is not JSON                                                            | Dropped by the shared validator (`parseClientMessage`); nothing is read from it                                           | protocol "refuses anything that is not a JSON object"; server "survives garbage, null, arrays, numbers and wrong types without throwing"                                  |
| 2   | `null` — crashed the process before this fix (`msg.kind` on `null`)              | Dropped by the validator before any field is read                                                                         | same two tests; the server test fails with the old code (uncaught `TypeError`, checked 2026-11-14)                                                                        |
| 3   | An array, a number, a string, `true`                                             | Dropped                                                                                                                   | same two tests                                                                                                                                                            |
| 4   | An unknown `kind`; missing or wrong-typed fields                                 | Dropped                                                                                                                   | protocol "refuses unknown kinds and missing or wrong-typed fields"                                                                                                        |
| 5   | `NaN`, `Infinity` (e.g. `1e400`), huge numbers, a direction component outside ±1 | Dropped; the core also treats a non-finite direction as standing still and clamps the magnitude to 1                      | protocol "refuses Infinity, huge numbers and components outside [-1, 1]"; core `field.test.ts` "clamps an oversized direction to unit speed and ignores NaN and Infinity" |
| 6   | Extra fields: a position, a coin count, a value, a team                          | Never read: the validator returns a fresh object with the known fields only                                               | protocol "accepts the three valid messages and returns only their known fields"; server "ignores a position, count or team sent along with an input"                      |
| 7   | `__proto__` to smuggle in a `kind`                                               | Dropped: `JSON.parse` makes it an own property, which is not `kind`                                                       | protocol "does not let \_\_proto\_\_ smuggle in a kind"                                                                                                                   |
| 8   | A binary frame, even with a valid input inside                                   | Ignored; clients speak JSON text                                                                                          | server "ignores binary frames, even a valid input in one"                                                                                                                 |
| 9   | An oversized message                                                             | The WebSocket server refuses frames above 256 bytes (`maxPayload`, close code 1009); the validator also checks the length | server "closes a socket that sends a frame above the size bound"; protocol "refuses a message longer than the bound before parsing it"                                    |
| 10  | A flood above the rate limit                                                     | Every message, valid or not, counts against `maxInputsPerSecond` (20); the rest of the second is dropped                  | server "drops messages above the per-second rate"                                                                                                                         |
| 11  | A second hello, or switching from player to spectator                            | Ignored; the first hello decides                                                                                          | server "keeps a player a player after a second hello"                                                                                                                     |
| 12  | A spectator sending inputs (or anything) after its hello                         | The connection is closed (1008)                                                                                           | server "closes a spectator that sends anything after its hello"                                                                                                           |

## Game actions (enforced by the game core)

| #   | A client tries                                      | The core's answer                                                            | Test                                                                                                 |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 13  | Swap away from the own shrine, or at another team's | Nothing happens                                                              | core `actions.test.ts` "is refused away from the own shrine and at another team’s shrine"            |
| 14  | Swap with fewer than 10 coins of the current season | Nothing happens                                                              | core "is refused with fewer than 10 coins of the current season"                                     |
| 15  | Secure away from the own shrine, or with nothing    | Nothing happens                                                              | core "is refused away from the own shrine and with nothing carried"                                  |
| 16  | Steal out of range, from a teammate, from itself    | Nothing happens; the target is chosen by the core (nearest opponent carrier) | core "does nothing out of range", "never takes from a teammate", "never takes from the thief itself" |
| 17  | Steal every tick                                    | One steal per cooldown (1 s, placeholder)                                    | core "waits for the cooldown before the next steal"                                                  |
| 18  | Move faster or through the wall                     | Speed comes from the config, the position is clamped to the field            | core "a carrier moves slower by the configured factor", "never leaves the field"                     |

## Connections and HTTP

| #   | A client tries                                                    | The server's answer                                                                                                    | Test                                                                                                                       |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 19  | Rapid reconnects                                                  | Each socket is freed exactly once ('error' and 'close' may both fire); ghosts and counters return to their prior state | server "leaves nothing behind after rapid reconnects"                                                                      |
| 20  | Many connections from one address                                 | Refused above `maxConnectionsPerAddress` (40 in development, room for 32 bots and viewers) with 1008                   | server "refuses more connections from one address than the bound"                                                          |
| 21  | Many connections in total                                         | Refused above twice the ghost count                                                                                    | server "refuses connections beyond twice the ghost count in total"                                                         |
| 22  | Reading `/metrics-lite` from outside                              | 404 for any caller that is not loopback, any method but GET, any other path; CORS `*` only in development              | routes "accepts IPv4, IPv6 and IPv4-mapped loopback", "refuses any other or missing address"; server "/metrics-lite" tests |
| 23  | Starting the dev server, the probe or the demo bots in production | They refuse to start with `NODE_ENV=production` (no sign-in, fake players)                                             | `apps/server/src/env.test.ts` "stops a development tool when NODE_ENV is production"                                       |
| 24  | Odd environment values (text, NaN, out of range)                  | The process stops with a clear message instead of running with a bad setting                                           | `env.test.ts` "stops on text, fractions, NaN, Infinity and values out of range"                                            |

## Open

- Behind the website's nginx every connection comes from the proxy's address, so the
  per-address bound (row 20) must use the forwarded client address from the trusted proxy once
  the game runs embedded (backlog g).
- A client that connects and never says hello holds a connection slot until it closes; a
  hello timeout comes with the match server (piece C).
