// Spike 3: within BEGIN; SET LOCAL ROLE player; <one statement>; ROLLBACK -- can a single statement escape?
import { PGlite } from '@electric-sql/pglite'

const db = await PGlite.create()
await db.exec(`
  CREATE TABLE monsters (id int, name text, hp int);
  INSERT INTO monsters VALUES (1,'rat',3),(2,'orc',12);
  CREATE ROLE player NOLOGIN;
  GRANT SELECT ON monsters TO player;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
`)
async function run(label, sql) {
  await db.exec('BEGIN; SET LOCAL ROLE player')
  try { console.log('OK  ', label, JSON.stringify((await db.query(sql)).rows).slice(0, 120)) }
  catch (e) { console.log('FAIL', label, '->', e.message) }
  await db.exec('ROLLBACK')
}
await run('multi statement', 'RESET ROLE; DELETE FROM monsters')
await run('set_config + query_to_xml', "SELECT set_config('role','postgres',true) r, query_to_xml('delete from monsters returning id', false, false, '') x")
console.log('rows after rollback:', (await db.query('select count(*) from monsters')).rows, 'user:', (await db.query('select current_user')).rows)

console.log('--- with REVOKE EXECUTE on escape functions')
await db.exec(`
  REVOKE EXECUTE ON FUNCTION set_config(text,text,boolean) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION query_to_xml(text,boolean,boolean,text) FROM PUBLIC;
`)
await run('set_config', "SELECT set_config('role','postgres',true)")
await run('query_to_xml', "SELECT query_to_xml('select 1', false, false, '')")
await run('plain select', 'SELECT name FROM monsters WHERE hp > 5')
