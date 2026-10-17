import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { grade, hiddenSeeds, sameResult } from './grade'
import { guardroom } from './rooms/guardroom'
import { createSandbox, runOnSeed } from './sandbox'

let db: PGlite
beforeAll(async () => {
  db = await createSandbox()
})

const SEEDS = Array.from({ length: 25 }, (_, i) => 1 + i * 7919)
const gradeSql = (sql: string, seed: number) => grade(guardroom, seed, (s) => runOnSeed(db, guardroom, s, sql))

describe('guardroom generator', () => {
  it('is deterministic per seed and differs across seeds', () => {
    expect(guardroom.generate(42)).toEqual(guardroom.generate(42))
    expect(guardroom.generate(42).data).not.toEqual(guardroom.generate(43).data)
  })

  it('reference SQL matches the JS-computed expected result on every seed', async () => {
    for (const seed of SEEDS) {
      const res = await runOnSeed(db, guardroom, seed, guardroom.reference)
      if (!res.ok) throw new Error(res.error)
      expect(sameResult(res.rows, guardroom.generate(seed).expected, false), `seed ${seed}`).toBe(true)
    }
  })
})

describe('grader', () => {
  it('opens the door for the reference solution on visible and hidden seeds', async () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const verdict = await gradeSql(guardroom.reference, seed)
      expect(verdict.seeds).toHaveLength(3)
      expect(verdict.passed, `seed ${seed}`).toBe(true)
    }
  })

  it('accepts other correct spellings, any row order and aliases', async () => {
    const sql = 'SELECT m.name AS who, m.hp FROM monsters m WHERE m.is_awake = true AND NOT m.hp <= 10 ORDER BY m.name DESC'
    expect((await gradeSql(sql, 1234)).passed).toBe(true)
  })

  it('fails a hardcoded WHERE id IN (...) on the hidden seeds', async () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const visible = await runOnSeed(db, guardroom, seed, 'SELECT id FROM monsters WHERE is_awake AND hp > 10')
      if (!visible.ok) throw new Error(visible.error)
      const hardcoded = `SELECT name, hp FROM monsters WHERE id IN (${visible.rows.map((r) => r[0]).join(', ')})`

      const verdict = await gradeSql(hardcoded, seed)
      expect(verdict.seeds[0].passed, `visible seed ${seed}`).toBe(true)
      expect(verdict.seeds.filter((v) => v.hidden).some((v) => !v.passed), `hidden seeds of ${seed}`).toBe(true)
      expect(verdict.passed).toBe(false)
    }
  })

  it('fails near misses: >= instead of >, a forgotten filter, extra columns', async () => {
    for (const sql of [
      'SELECT name, hp FROM monsters WHERE is_awake AND hp >= 10',
      'SELECT name, hp FROM monsters WHERE hp > 10',
      'SELECT name, hp FROM monsters WHERE is_awake',
      'SELECT name, hp, species FROM monsters WHERE is_awake AND hp > 10',
    ]) {
      expect((await gradeSql(sql, 99)).passed, sql).toBe(false)
    }
  })

  it('derives two hidden seeds that differ from the visible one', () => {
    const hidden = hiddenSeeds(5)
    expect(hidden).toHaveLength(2)
    expect(hidden).not.toContain(5)
    expect(hiddenSeeds(5)).toEqual(hidden)
  })

  it('compares order only when asked to', () => {
    const a = [['x', 1], ['y', 2]]
    const b = [['y', 2], ['x', 1]]
    expect(sameResult(a, b, false)).toBe(true)
    expect(sameResult(a, b, true)).toBe(false)
    expect(sameResult([['x', 1]], [['x', 1], ['x', 1]], false)).toBe(false)
  })
})
