import { mulberry32, pick, randInt, shuffle } from '../prng'
import { sqlString, type Room, type Row } from '../room'

const NAMES = [
  'Grubnak', 'Snikkit', 'Morga', 'Thrask', 'Vilka', 'Bolg', 'Ruzzle', 'Krenna',
  'Ozzik', 'Fenwick', 'Drogg', 'Mirelle', 'Skarn', 'Yelva', 'Pibbin', 'Hrothi',
  'Zekka', 'Gnash', 'Ulla', 'Wortle', 'Brakka', 'Quill', 'Nettle', 'Sorrow',
]
const SPECIES = ['goblin', 'rat', 'skeleton', 'slime', 'orc', 'bat']

type Monster = { id: number; name: string; species: string; hp: number; isAwake: boolean }

// hp ranges per kind; 'edge' sits exactly on the threshold to punish `>=`.
const KINDS = {
  awakeStrong: { awake: true, hp: [11, 40] },
  asleepStrong: { awake: false, hp: [11, 40] },
  awakeWeak: { awake: true, hp: [1, 9] },
  edge: { awake: true, hp: [10, 10] },
} as const

export const guardroom: Room = {
  id: 'guardroom',
  floor: 1,
  title: 'The Guardroom',
  story:
    'A sergeant blocks the door. "Before anyone passes, I want a list of every monster on duty that could actually hold this door."',
  task: 'Return the name and hp of every monster that is awake and has more than 10 hp.',
  orderMatters: false,
  tables: { monsters: ['id', 'name', 'species', 'hp', 'is_awake'] },
  ddl: 'CREATE TABLE monsters (id int PRIMARY KEY, name text NOT NULL, species text NOT NULL, hp int NOT NULL, is_awake boolean NOT NULL)',
  reference: 'SELECT name, hp FROM monsters WHERE is_awake AND hp > 10',

  generate(seed) {
    const rand = mulberry32(seed)
    const count = randInt(rand, 8, 12)
    const kindNames = Object.keys(KINDS) as (keyof typeof KINDS)[]
    // Every kind at least once, so wrong filters fail on every seed; the rest at random.
    const kinds = shuffle(rand, [...kindNames, ...Array.from({ length: count - kindNames.length }, () => pick(rand, kindNames))])
    const names = shuffle(rand, [...NAMES])
    const monsters: Monster[] = kinds.map((k, i) => ({
      id: i + 1,
      name: names[i],
      species: pick(rand, SPECIES),
      hp: randInt(rand, KINDS[k].hp[0], KINDS[k].hp[1]),
      isAwake: KINDS[k].awake,
    }))

    const values = monsters
      .map((m) => `(${m.id}, ${sqlString(m.name)}, ${sqlString(m.species)}, ${m.hp}, ${m.isAwake})`)
      .join(',\n  ')
    const expected: Row[] = monsters.filter((m) => m.isAwake && m.hp > 10).map((m) => [m.name, m.hp])
    return { data: `INSERT INTO monsters VALUES\n  ${values}`, expected }
  },
}
