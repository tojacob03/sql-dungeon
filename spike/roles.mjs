// Spike: do Postgres roles/privileges work in PGlite?
import { PGlite } from '@electric-sql/pglite'

const db = await PGlite.create()
const q = async (label, sql) => {
  try {
    const r = await db.query(sql)
    console.log('OK  ', label, JSON.stringify(r.rows))
  } catch (e) {
    console.log('FAIL', label, '->', e.message)
  }
}

await db.exec(`
  CREATE TABLE monsters (id int, name text, hp int);
  INSERT INTO monsters VALUES (1,'rat',3),(2,'orc',12);
  CREATE SCHEMA secret;
  CREATE TABLE secret.answer (id int);
  CREATE ROLE player NOLOGIN;
  GRANT USAGE ON SCHEMA public TO player;
  GRANT SELECT ON monsters TO player;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
`)
await q('whoami before', 'select current_user, session_user')
await q('set role', 'SET ROLE player')
await q('whoami after', 'select current_user, session_user')
await q('select allowed', 'SELECT * FROM monsters')
await q('insert', "INSERT INTO monsters VALUES (3,'x',1)")
await q('update', 'UPDATE monsters SET hp = 0')
await q('delete', 'DELETE FROM monsters')
await q('drop', 'DROP TABLE monsters')
await q('create in public', 'CREATE TABLE t (a int)')
await q('temp table', 'CREATE TEMP TABLE t (a int)')
await q('secret schema', 'SELECT * FROM secret.answer')
await q('escape via reset role', 'RESET ROLE')
await q('whoami after reset', 'select current_user')
await q('escape via set session authorization', 'SET SESSION AUTHORIZATION postgres')
await q('whoami', 'select current_user')
