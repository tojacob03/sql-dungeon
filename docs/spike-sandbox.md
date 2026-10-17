# Spike: can PGlite sandbox a player's query?

Run with `node spike/<file>.mjs` (PGlite 0.5.10, Node 22). Findings, 2026-10-17:

## Roles and privileges (`roles.mjs`, `roles-login.mjs`)

- `CREATE ROLE`, `GRANT`, `REVOKE` and `SET ROLE player` work. As `player`,
  INSERT, UPDATE, DELETE, DROP and CREATE in `public` are refused with
  `permission denied`, and a schema without USAGE is unreadable.
- **But the role is not a boundary.** PGlite runs Postgres in single-user mode,
  so `session_user` is always the superuser `postgres`. `RESET ROLE`,
  `SET ROLE postgres`, `SET SESSION AUTHORIZATION postgres` and
  `set_config('role', 'postgres', false)` all succeed from `player`.
  `PGlite.create({ username: 'player' })` does not help: it also only sets the
  current role, `session_user` stays `postgres`.
- `CREATE TEMP TABLE` works as `player` (harmless here, rolled back).

## What makes it hold anyway (`roles-escape.mjs`)

Each execution runs as

```
BEGIN; <create + fill room tables as postgres>; SET LOCAL ROLE player;
<player query via extended protocol>; ROLLBACK
```

- The extended protocol (`db.query`) accepts exactly one statement:
  `RESET ROLE; DELETE FROM monsters` fails with
  `cannot insert multiple commands into a prepared statement`.
- Inside one statement, privilege checks happen before execution, so an escape
  needs a function that changes the role or runs SQL at runtime.
  `REVOKE EXECUTE ... FROM PUBLIC` on `set_config` and the `query_to_xml` /
  `cursor_to_xml` family blocks the known ones (`permission denied for function`).
- Everything ends in ROLLBACK, including role and GUC changes, and room data is
  rebuilt inside the transaction per seed. Hidden seeds and expected results are
  never stored in the database, so there is nothing secret to read.

- A single `COMMIT` would end the transaction early and leave the room tables
  behind. So the player's query runs as `DECLARE player_query CURSOR FOR <sql>`
  plus `FETCH ALL`: Postgres' own grammar then accepts only a SELECT (no INSERT,
  DROP, COMMIT, and no data-modifying `WITH`). This is the "SELECT only" check
  without shipping a second parser.

Covered by `src/game/sandbox.test.ts`.

## Further fallback if this proves leaky

Parse the query with `libpg-query` (WASM build of the Postgres parser) and allow
only a single `SelectStmt` without `INTO` or locking clause. Note: that alone
would **not** stop `SELECT set_config('role', ...)`, which is a valid SELECT; it
complements the function revokes, it does not replace them.

The honest limit: the database runs in the player's own browser, so a player can
always cheat through devtools. Anything with a leaderboard needs the hidden seeds
graded on a server.

## Endless queries (`timeout.mjs`)

**`statement_timeout` does not fire in PGlite.** With `500ms`, `pg_sleep(3)` ran
3001 ms and `count(*)` over 300M rows ran 62 s. The WASM build is single
threaded and has no timer signal. So the only guard is on the JS side: the
query runs in a Web Worker, and the main thread terminates and restarts the
worker when it does not answer in time (`src/db/client.ts`).
