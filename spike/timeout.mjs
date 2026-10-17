// Spike 4: does statement_timeout fire inside PGlite (WASM, single thread)?
import { PGlite } from '@electric-sql/pglite'
const db = await PGlite.create()
await db.exec("SET statement_timeout = '500ms'")
for (const sql of ['SELECT pg_sleep(3)', 'SELECT count(*) FROM generate_series(1, 300000000)']) {
  const t = Date.now()
  try { await db.query(sql); console.log('finished', sql, Date.now() - t, 'ms') }
  catch (e) { console.log('error', sql, Date.now() - t, 'ms', e.message) }
}
console.log('still alive:', (await db.query('select 1 as ok')).rows)
