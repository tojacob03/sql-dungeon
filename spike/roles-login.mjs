// Spike 2: can PGlite open a session AS player (so RESET ROLE can't escape)?
import { PGlite } from '@electric-sql/pglite'

const admin = await PGlite.create()
await admin.exec(`
  CREATE TABLE monsters (id int, name text, hp int);
  INSERT INTO monsters VALUES (1,'rat',3),(2,'orc',12);
  CREATE ROLE player LOGIN;
  GRANT SELECT ON monsters TO player;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
`)
const dump = await admin.dumpDataDir('none')
await admin.close()

const db = await PGlite.create({ loadDataDir: dump, username: 'player' })
const q = async (label, sql) => {
  try { console.log('OK  ', label, JSON.stringify((await db.query(sql)).rows)) }
  catch (e) { console.log('FAIL', label, '->', e.message) }
}
await q('whoami', 'select current_user, session_user')
await q('select', 'select count(*) from monsters')
await q('insert', "insert into monsters values (3,'x',1)")
await q('reset role', 'RESET ROLE')
await q('set role postgres', 'SET ROLE postgres')
await q('session auth', 'SET SESSION AUTHORIZATION postgres')
await q('set_config role', "select set_config('role','postgres',false)")
await q('whoami', 'select current_user, session_user')
await q('insert again', "insert into monsters values (3,'x',1)")
