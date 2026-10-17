import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'
import { NAMES } from './words'

const SQUADS = ['Ash', 'Iron', 'Raven', 'Lantern', 'Moth', 'Gallows', 'Salt']
const RANKS = ['private', 'corporal', 'sergeant']

export const barracks: Room = {
  id: 'barracks',
  title: 'The Barracks',
  story: 'Bunks for whole squads, most of them asleep. Only a squad bigger than three dares to stop you.',
  task: 'Return every squad with more than three soldiers, and how many soldiers it has.',
  hint: 'WHERE filters rows before grouping; HAVING filters groups after. count(*) counts the rows in each group.',
  orderMatters: false,
  tables: { soldiers: ['id', 'name', 'squad', 'rank'] },
  ddl: 'CREATE TABLE soldiers (id int PRIMARY KEY, name text NOT NULL, squad text NOT NULL, rank text NOT NULL)',
  reference: 'SELECT squad, count(*) FROM soldiers GROUP BY squad HAVING count(*) > 3',

  generate(seed) {
    const rand = mulberry32(seed)
    const squads = shuffle(rand, [...SQUADS]).slice(0, randInt(rand, 4, 6))
    // One squad of exactly three (punishes >= 3), one of at least four, the rest anything.
    const sizes = squads.map((_, i) => (i === 0 ? 3 : i === 1 ? randInt(rand, 4, 6) : randInt(rand, 1, 6)))
    const members = shuffle(rand, squads.flatMap((squad, i) => Array.from({ length: sizes[i] }, () => squad)))
    const soldiers = members.map((squad, i) => [i + 1, pick(rand, NAMES), squad, pick(rand, RANKS)])
    const expected: Row[] = squads.map((s, i): Row => [s, sizes[i]]).filter((r) => (r[1] as number) > 3)
    return { data: insert('soldiers', soldiers), expected }
  },
}
