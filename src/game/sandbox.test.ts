import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { guardroom } from './rooms/guardroom'
import { createSandbox, runOnSeed } from './sandbox'

let db: PGlite
beforeAll(async () => {
  db = await createSandbox()
})

const run = (sql: string) => runOnSeed(db, guardroom, 7, sql)

describe('sandbox', () => {
  it.each([
    ["INSERT INTO monsters VALUES (99, 'x', 'rat', 1, true)", 'Only a single SELECT'],
    ['DROP TABLE monsters', 'Only a single SELECT'],
    ['COMMIT', 'Only a single SELECT'],
    ['SELECT 1; DELETE FROM monsters', 'multiple commands'],
    ['WITH d AS (DELETE FROM monsters RETURNING *) SELECT * FROM d', 'data-modifying'],
    ["SELECT set_config('role', 'postgres', false)", 'permission denied for function set_config'],
    ["SELECT query_to_xml('select 1', false, false, '')", 'permission denied for function query_to_xml'],
    ['SELECT * FROM monsters FOR UPDATE', 'permission denied'],
  ])('rejects %s', async (sql, message) => {
    const res = await run(sql)
    expect(res.ok).toBe(false)
    expect(res.ok ? '' : res.error).toContain(message)
  })

  it('leaves no trace: same data, no tables, superuser restored', async () => {
    const before = await run('SELECT * FROM monsters')
    await run("INSERT INTO monsters VALUES (99, 'x', 'rat', 1, true)")
    await run('COMMIT')
    expect(await run('SELECT * FROM monsters')).toEqual(before)

    const tables = await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'")
    expect(tables.rows).toEqual([{ n: 0 }])
    const user = await db.query('SELECT current_user AS u')
    expect(user.rows).toEqual([{ u: 'postgres' }])
  })

  it('runs as player', async () => {
    expect(await run('SELECT current_user')).toMatchObject({ ok: true, rows: [['player']] })
  })
})
