# SQL Dungeon

A roguelike in the browser where the only way forward is SQL.

Milestone 1: one playable room, no graphics. Postgres runs in the browser
([PGlite](https://pglite.dev), WASM) inside a Web Worker; there is no server.

## How a room works

- A room is a generator: `seed -> table data + expected result`
  (`src/game/rooms/guardroom.ts`, seeded with mulberry32).
- **Try the door** runs your query on the room you see and on two hidden rooms
  from other seeds, like hidden test cases. The door opens only if all three
  results match (as multisets; row order only counts when the task asks for
  ORDER BY). A hardcoded `WHERE id IN (...)` passes here and fails there.
- Every run builds the room inside a transaction, runs your query as role
  `player` through a cursor (so only one SELECT is accepted), then rolls back.
- Endless queries: the worker is killed and restarted after 4 s, because
  `statement_timeout` does not fire in PGlite.

What holds and what doesn't in the sandbox: [docs/spike-sandbox.md](docs/spike-sandbox.md).

## Run

```bash
npm install
npm run dev     # play at http://localhost:5173 (?seed=123 for a fixed room)
npm test        # Vitest: reference solution, hidden seeds, sandbox escapes
npm run build
```
