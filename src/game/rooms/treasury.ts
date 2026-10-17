import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const CHAMBERS = ['North cell', 'Well room', 'Bell loft', 'Gallery', 'Cistern', 'Ossuary', 'Lower vault', 'Kennel']

export const treasury: Room = {
  id: 'treasury',
  title: 'The Treasury',
  story: 'Chests everywhere, most of them half empty. The ferryman below takes only the three heaviest.',
  task: 'Return the chamber and gold of the three richest chests, richest first.',
  hint: 'ORDER BY sorts ascending unless you say DESC. LIMIT keeps the first rows after sorting.',
  orderMatters: true,
  tables: { chests: ['id', 'chamber', 'gold', 'is_trapped'] },
  ddl: 'CREATE TABLE chests (id int PRIMARY KEY, chamber text NOT NULL, gold int NOT NULL, is_trapped boolean NOT NULL)',
  reference: 'SELECT chamber, gold FROM chests ORDER BY gold DESC LIMIT 3',

  generate(seed) {
    const rand = mulberry32(seed)
    const count = randInt(rand, 7, 11)
    // Distinct amounts, so "the three richest" has exactly one answer.
    const golds = shuffle(rand, Array.from({ length: 60 }, (_, i) => (i + 1) * 15)).slice(0, count)
    const chests = golds.map((gold, i) => ({ id: i + 1, chamber: pick(rand, CHAMBERS), gold, trapped: rand() < 0.3 }))
    const expected: Row[] = [...chests].sort((a, b) => b.gold - a.gold).slice(0, 3).map((c) => [c.chamber, c.gold])
    return { data: insert('chests', chests.map((c) => [c.id, c.chamber, c.gold, c.trapped])), expected }
  },
}
