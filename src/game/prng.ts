// mulberry32: tiny seeded PRNG, returns floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randInt = (rand: () => number, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1))

export const pick = <T>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)]

export function shuffle<T>(rand: () => number, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
