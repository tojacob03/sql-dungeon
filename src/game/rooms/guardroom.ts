import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'
import { NAMES, SPECIES } from './words'

// hp ranges per kind; 'edge' sits exactly on the threshold to punish `>=`.
const KINDS = {
  awakeStrong: { awake: true, hp: [11, 40] },
  asleepStrong: { awake: false, hp: [11, 40] },
  awakeWeak: { awake: true, hp: [1, 9] },
  edge: { awake: true, hp: [10, 10] },
} as const

export const guardroom: Room = {
  id: 'guardroom',
  title: 'The Guardroom',
  story: 'A sergeant blocks the door. "Before anyone passes, I want every monster on duty that could actually hold this door."',
  task: 'Return the name and hp of every monster that is awake and has more than 10 hp.',
  hint: 'Two conditions in one WHERE, joined with AND. "More than 10" does not include 10.',
  orderMatters: false,
  tables: { monsters: ['id', 'name', 'species', 'hp', 'is_awake'] },
  ddl: 'CREATE TABLE monsters (id int PRIMARY KEY, name text NOT NULL, species text NOT NULL, hp int NOT NULL, is_awake boolean NOT NULL)',
  reference: 'SELECT name, hp FROM monsters WHERE is_awake AND hp > 10',

  generate(seed) {
    const rand = mulberry32(seed)
    const kindNames = Object.keys(KINDS) as (keyof typeof KINDS)[]
    // Every kind at least once, so wrong filters fail on every seed; the rest at random.
    const extra = randInt(rand, 4, 8)
    const kinds = shuffle(rand, [...kindNames, ...Array.from({ length: extra }, () => pick(rand, kindNames))])
    const names = shuffle(rand, [...NAMES])
    const monsters = kinds.map((k, i) => ({
      id: i + 1,
      name: names[i],
      species: pick(rand, SPECIES),
      hp: randInt(rand, KINDS[k].hp[0], KINDS[k].hp[1]),
      awake: KINDS[k].awake,
    }))
    const expected: Row[] = monsters.filter((m) => m.awake && m.hp > 10).map((m) => [m.name, m.hp])
    return { data: insert('monsters', monsters.map((m) => [m.id, m.name, m.species, m.hp, m.awake])), expected }
  },
}
