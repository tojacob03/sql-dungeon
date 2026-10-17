import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { FLOORS, ROOMS } from './dungeon'
import { grade, sameResult } from './grade'
import type { Room, Row, Value } from './room'
import { createSandbox, runOnSeed } from './sandbox'

let db: PGlite
beforeAll(async () => {
  db = await createSandbox()
})

const SEEDS = Array.from({ length: 20 }, (_, i) => 1 + i * 7919)
const passes = async (room: Room, sql: string, seed: number) =>
  (await grade(room, seed, (s) => runOnSeed(db, room, s, sql))).passed

// Typical wrong answers. Each must keep the door shut on every seed tried.
const TRAPS: Record<string, string[]> = {
  guardroom: [
    'SELECT name, hp FROM monsters WHERE is_awake AND hp >= 10',
    'SELECT name, hp FROM monsters WHERE hp > 10',
    'SELECT name, hp, species FROM monsters WHERE is_awake AND hp > 10',
  ],
  armory: [
    "SELECT name, damage FROM weapons WHERE kind = 'sword' OR kind = 'axe' AND NOT is_cursed",
    "SELECT name, damage FROM weapons WHERE kind IN ('sword', 'axe')",
    'SELECT name, damage FROM weapons WHERE NOT is_cursed',
  ],
  treasury: [
    'SELECT chamber, gold FROM chests ORDER BY gold LIMIT 3',
    'SELECT chamber, gold FROM chests ORDER BY gold DESC',
    'SELECT chamber, gold FROM chests LIMIT 3',
  ],
  rollcall: ['SELECT species FROM sightings ORDER BY species', 'SELECT DISTINCT species FROM sightings ORDER BY species DESC'],
  ledger: [
    'SELECT adventurer, count(*) FROM loot GROUP BY adventurer',
    'SELECT adventurer, max(value) FROM loot GROUP BY adventurer',
    'SELECT adventurer, value FROM loot',
  ],
  barracks: [
    'SELECT squad, count(*) FROM soldiers GROUP BY squad HAVING count(*) >= 3',
    'SELECT squad, count(*) FROM soldiers GROUP BY squad',
  ],
  keyring: [
    'SELECT k.name, d.label FROM keys k LEFT JOIN doors d ON d.id = k.door_id',
    'SELECT k.name, d.label FROM keys k JOIN doors d ON d.id = k.id',
    'SELECT k.name, d.label FROM keys k, doors d',
  ],
  emptycells: [
    'SELECT id, block FROM cells WHERE id NOT IN (SELECT cell_id FROM prisoners)',
    'SELECT DISTINCT c.id, c.block FROM cells c JOIN prisoners p ON p.cell_id <> c.id',
    'SELECT c.id, c.block FROM cells c LEFT JOIN prisoners p ON p.cell_id = c.id',
  ],
  alchemist: [
    'SELECT name, potency FROM potions WHERE potency >= (SELECT avg(potency) FROM potions)',
    'SELECT name, potency FROM potions WHERE potency > (SELECT max(potency) FROM potions) / 2',
  ],
  champions: [
    'SELECT guild, name, max(xp) FROM adventurers GROUP BY guild, name',
    'SELECT guild, name, xp FROM adventurers WHERE xp = (SELECT max(xp) FROM adventurers)',
  ],
  endlessstair: [
    "SELECT to_chamber FROM passages WHERE from_chamber = 'Gate'",
    "SELECT 'Gate' UNION SELECT p2.to_chamber FROM passages p1 JOIN passages p2 ON p2.from_chamber = p1.to_chamber WHERE p1.from_chamber = 'Gate' UNION SELECT to_chamber FROM passages WHERE from_chamber = 'Gate'",
    'SELECT from_chamber FROM passages UNION SELECT to_chamber FROM passages',
  ],
}

const literal = (v: Value) => (typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : String(v))
const valuesQuery = (rows: Row[]) => `SELECT * FROM (VALUES ${rows.map((r) => `(${r.map(literal).join(', ')})`).join(', ')}) t`

it('every floor but the last offers two doors, every room has traps', () => {
  expect(FLOORS.slice(0, -1).every((f) => f.rooms.length === 2)).toBe(true)
  expect(FLOORS.at(-1)!.rooms).toHaveLength(1)
  expect(Object.keys(TRAPS).sort()).toEqual(Object.keys(ROOMS).sort())
})

describe.each(Object.values(ROOMS).map((r) => [r.id, r] as const))('%s', (_, room) => {
  it('is deterministic per seed, varies across seeds, never expects an empty result', () => {
    expect(room.generate(42)).toEqual(room.generate(42))
    const results = new Set(SEEDS.map((s) => JSON.stringify(room.generate(s).expected)))
    expect(results.size).toBeGreaterThan(SEEDS.length * 0.8)
    for (const s of SEEDS) expect(room.generate(s).expected.length, `seed ${s}`).toBeGreaterThan(0)
  })

  it('reference SQL matches the JS-computed expected result on every seed', async () => {
    for (const seed of SEEDS) {
      const res = await runOnSeed(db, room, seed, room.reference)
      if (!res.ok) throw new Error(`seed ${seed}: ${res.error}`)
      expect(sameResult(res.rows, room.generate(seed).expected, room.orderMatters), `seed ${seed}`).toBe(true)
    }
  })

  it('opens the door for the reference solution', async () => {
    for (const seed of SEEDS.slice(0, 6)) expect(await passes(room, room.reference, seed), `seed ${seed}`).toBe(true)
  })

  it('keeps the door shut for the visible answer typed in as literal rows', async () => {
    for (const seed of SEEDS.slice(0, 6)) {
      const verdict = await grade(room, seed, (s) => runOnSeed(db, room, s, valuesQuery(room.generate(seed).expected)))
      expect(verdict.seeds[0].passed, `visible seed ${seed}`).toBe(true)
      expect(verdict.passed, `hidden seeds of ${seed}`).toBe(false)
    }
  })

  it.each(TRAPS[room.id])('keeps the door shut for: %s', async (sql) => {
    for (const seed of SEEDS.slice(0, 6)) expect(await passes(room, sql, seed), `seed ${seed}`).toBe(false)
  })
})
