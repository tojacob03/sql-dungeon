import { mulberry32 } from './prng'
import type { Room, Row } from './room'
import type { RunResult } from './sandbox'

export const randomSeed = () => 1 + Math.floor(Math.random() * 999_999)

// Two hidden seeds per visible seed, like hidden test cases.
export function hiddenSeeds(seed: number): number[] {
  const rand = mulberry32(seed ^ 0x9e3779b9)
  return [0, 1].map(() => 1 + Math.floor(rand() * 999_999))
}

const rowKey = (row: Row) => JSON.stringify(row, (_, v) => (typeof v === 'bigint' ? Number(v) : v))

// Rows compared by value and column position; column names don't matter.
// Unordered tasks compare as multisets.
export function sameResult(actual: Row[], expected: Row[], ordered: boolean): boolean {
  if (actual.length !== expected.length) return false
  const a = actual.map(rowKey)
  const e = expected.map(rowKey)
  if (!ordered) {
    a.sort()
    e.sort()
  }
  return a.every((key, i) => key === e[i])
}

export type SeedVerdict = { seed: number; hidden: boolean; passed: boolean; error?: string }
export type Verdict = { passed: boolean; seeds: SeedVerdict[] }

export async function grade(
  room: Room,
  seed: number,
  run: (seed: number) => Promise<RunResult>,
): Promise<Verdict> {
  const seeds: SeedVerdict[] = []
  for (const [s, hidden] of [[seed, false], ...hiddenSeeds(seed).map((h) => [h, true])] as [number, boolean][]) {
    const res = await run(s)
    seeds.push(
      res.ok
        ? { seed: s, hidden, passed: sameResult(res.rows, room.generate(s).expected, room.orderMatters) }
        : { seed: s, hidden, passed: false, error: res.error },
    )
  }
  return { passed: seeds.every((v) => v.passed), seeds }
}
