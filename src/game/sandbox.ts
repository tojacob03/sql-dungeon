import { PGlite } from '@electric-sql/pglite'
import type { Room, Row } from './room'

// PGlite's session user is always the superuser, so `player` can switch roles back.
// These functions would let a single statement do that, or run SQL at runtime.
// See docs/spike-sandbox.md.
const ESCAPE_FUNCTIONS = [
  'set_config(text, text, boolean)',
  'query_to_xml(text, boolean, boolean, text)',
  'query_to_xmlschema(text, boolean, boolean, text)',
  'query_to_xml_and_xmlschema(text, boolean, boolean, text)',
  'cursor_to_xml(refcursor, integer, boolean, boolean, text)',
  'cursor_to_xmlschema(refcursor, boolean, boolean, text)',
]

export async function createSandbox(): Promise<PGlite> {
  const db = await PGlite.create()
  await db.exec(`
    CREATE ROLE player NOLOGIN;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO player;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO player;
    ${ESCAPE_FUNCTIONS.map((f) => `REVOKE EXECUTE ON FUNCTION ${f} FROM PUBLIC;`).join('\n')}
  `)
  return db
}

export type RunResult =
  | { ok: true; columns: string[]; rows: Row[] }
  | { ok: false; error: string }

const CURSOR_PREFIX = 'DECLARE player_query NO SCROLL CURSOR FOR '

// Builds the room for `seed`, runs `sql` as player, then rolls everything back.
// The query goes through DECLARE CURSOR: Postgres itself then accepts exactly one
// SELECT (no INSERT, no COMMIT, no data-modifying WITH), and the extended protocol
// rejects a second statement.
export async function runOnSeed(db: PGlite, room: Room, seed: number, sql: string): Promise<RunResult> {
  await db.exec('BEGIN')
  try {
    await db.exec(`${room.ddl};\n${room.generate(seed).data};\nSET LOCAL ROLE player`)
    try {
      await db.query(CURSOR_PREFIX + sql)
    } catch (e) {
      throw selectOnlyHint(e)
    }
    const res = await db.query<Row>('FETCH ALL FROM player_query', [], { rowMode: 'array' })
    return { ok: true, columns: res.fields.map((f) => f.name), rows: res.rows }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    await db.exec('ROLLBACK')
  }
}

// A syntax error on the player's first token means it was not a SELECT.
function selectOnlyHint(e: unknown) {
  const pos = Number((e as { position?: string }).position)
  if (e instanceof Error && e.message.startsWith('syntax error') && pos === CURSOR_PREFIX.length + 1) {
    return new Error(`${e.message}. Only a single SELECT query is allowed here.`)
  }
  return e
}
