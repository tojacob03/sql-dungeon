# SQL Dungeon

A roguelike through Piranesi's imaginary prisons where the only way forward is SQL.

Every door opens to one query. The query runs on the room you can see and on two rooms you can't, built from other seeds, like hidden test cases. Copy the visible answer into a `VALUES` list and the door stays shut.

Postgres runs in your browser ([PGlite](https://pglite.dev), WASM, in a Web Worker). There is no server.

## The run

- **Six floors, one seed.** Every run builds its rooms from a seed; share `?seed=123` and a friend gets the same dungeon. The **daily dungeon** uses the date as its seed.
- **Pick a door.** Each floor offers two rooms that test the same idea; the last floor has one.
- **Four torches.** A wrong door or a hint burns one. A door opened on the first try lights one again. Lose the last torch and the run is over.
- **Score.** Deeper floors are worth more, every wrong door costs a fifth, torches left at the end count extra. Your best per seed is kept in the browser.

| Floor | Teaches | Rooms |
| --- | --- | --- |
| The Great Square | SELECT, WHERE | The Guardroom, The Armory |
| The Staircase | ORDER BY, LIMIT, DISTINCT | The Treasury, The Roll Call |
| The Giant Wheel | GROUP BY, HAVING | The Loot Ledger, The Barracks |
| The Chained Pier | JOIN | The Keyring, The Empty Cells |
| The Sawhorse | Subqueries | The Alchemist's Shelf, The Champions |
| The Drawbridge | WITH RECURSIVE | The Endless Stair |

## How a room is built

A room is a generator: `seed -> INSERT statements + expected result`, computed in plain TypeScript from the same seeded data (`src/game/rooms/`). Each room also has a reference solution in SQL, and the generators plant the edge cases that catch typical mistakes: a monster at exactly 10 hp to punish `>=`, a cursed sword to catch `a OR b AND c`, a prisoner with a `NULL` cell to break `NOT IN`, a loop in the passages so `UNION ALL` never ends.

The grader compares results as multisets (order only counts when the task asks for it) on the visible seed plus two hidden ones. Every run builds the room inside a transaction, runs your query as role `player` through a cursor so only a single `SELECT` is accepted, and rolls back. Endless queries are stopped by restarting the worker, because `statement_timeout` does not fire in PGlite. What holds and what doesn't: [docs/spike-sandbox.md](docs/spike-sandbox.md).

## Tests

`npm test` runs, for every room and 20 seeds: the reference SQL matches the JS-computed answer; the reference opens the door; the visible answer typed in as literal rows fails on the hidden seeds; and two or three typical wrong queries per room keep the door shut. Plus the run rules (torches, score, death, win) and sandbox escapes (`INSERT`, `COMMIT`, multiple statements, `set_config`, data-modifying `WITH`).

## Run it

```bash
npm install
npm run dev
npm test
npm run build
```

## Design

The arch from Piranesi's prisons is the one shape in the system: the hero, the doors, the image masks, the buttons and the torches. The plates are printed light on teal inside it.

Etchings by Giovanni Battista Piranesi from *Le Carceri d'invenzione*, second edition, 1761, public domain (CC0 or public domain mark), scans via Wikimedia Commons. Sources in [assets/credits.json](assets/credits.json).
