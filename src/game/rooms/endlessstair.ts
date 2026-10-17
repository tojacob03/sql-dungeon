import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const CHAMBERS = [
  'Well', 'Bridge', 'Wheel', 'Tower', 'Vault', 'Crypt', 'Forge', 'Chapel', 'Pit',
  'Gallery', 'Cistern', 'Ossuary', 'Belfry', 'Kennel', 'Archive', 'Lantern room',
]

export const endlessstair: Room = {
  id: 'endlessstair',
  title: 'The Endless Stair',
  story: 'Stairs climb into stairs, bridges loop back on themselves. Somewhere in the tangle is the way out, and you have to know every chamber the Gate leads to.',
  task: 'Return every chamber you can reach from the Gate by following passages, the Gate included.',
  hint: 'WITH RECURSIVE reach(chamber) AS (start row UNION step from reach through passages). Use UNION, not UNION ALL: the passages loop, and UNION ALL never stops.',
  orderMatters: false,
  tables: { passages: ['from_chamber', 'to_chamber'] },
  ddl: 'CREATE TABLE passages (from_chamber text NOT NULL, to_chamber text NOT NULL, PRIMARY KEY (from_chamber, to_chamber))',
  reference: `WITH RECURSIVE reach(chamber) AS (
  SELECT 'Gate'::text
  UNION
  SELECT p.to_chamber FROM passages p JOIN reach r ON p.from_chamber = r.chamber
)
SELECT chamber FROM reach`,

  generate(seed) {
    const rand = mulberry32(seed)
    const names = shuffle(rand, [...CHAMBERS])
    const chain = ['Gate', ...names.splice(0, randInt(rand, 4, 6))]
    const branches = names.splice(0, randInt(rand, 1, 3))
    const sealed = names.splice(0, randInt(rand, 2, 4))
    const reachable = [...chain, ...branches]

    const edges = new Map<string, [string, string]>()
    const add = (from: string, to: string) => from !== to && edges.set(`${from}>${to}`, [from, to])
    // A chain at least four steps deep, so a fixed number of joins never gets to the end.
    chain.slice(1).forEach((c, i) => add(chain[i], c))
    for (const b of branches) add(pick(rand, chain), b)
    // A loop back to the Gate and a few shortcuts inside the reachable part.
    add(chain[chain.length - 1], 'Gate')
    for (let i = randInt(rand, 1, 3); i > 0; i--) add(pick(rand, reachable), pick(rand, reachable))
    // Sealed chambers lead into the maze, but nothing leads to them.
    sealed.forEach((s, i) => {
      add(s, pick(rand, reachable))
      if (i > 0) add(sealed[i - 1], s)
    })

    const passages = shuffle(rand, [...edges.values()])
    const seen = new Set(['Gate'])
    const queue = ['Gate']
    while (queue.length) {
      const from = queue.shift()!
      for (const [f, t] of passages) {
        if (f !== from || seen.has(t)) continue
        seen.add(t)
        queue.push(t)
      }
    }
    const expected: Row[] = [...seen].map((c) => [c])
    return { data: insert('passages', passages), expected }
  },
}
