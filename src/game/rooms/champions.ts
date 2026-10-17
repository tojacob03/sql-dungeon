import { mulberry32, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'
import { NAMES } from './words'

const GUILDS = ['Lamplighters', 'Gravediggers', 'Ratcatchers', 'Bellringers', 'Ropemakers']

export const champions: Room = {
  id: 'champions',
  title: 'The Champions',
  story: 'Each guild down here sends its strongest to the sawhorse. You must name them before they name you.',
  task: 'For each guild, return the guild, the name and the xp of its strongest adventurer.',
  hint: 'Compare each row to the best of its own guild: WHERE xp = (SELECT max(xp) FROM adventurers b WHERE b.guild = a.guild).',
  orderMatters: false,
  tables: { adventurers: ['id', 'name', 'guild', 'xp'] },
  ddl: 'CREATE TABLE adventurers (id int PRIMARY KEY, name text NOT NULL, guild text NOT NULL, xp int NOT NULL)',
  reference: 'SELECT guild, name, xp FROM adventurers a WHERE xp = (SELECT max(xp) FROM adventurers b WHERE b.guild = a.guild)',

  generate(seed) {
    const rand = mulberry32(seed)
    const guilds = shuffle(rand, [...GUILDS]).slice(0, randInt(rand, 3, 4))
    // Every guild has at least two members; all xp values distinct, so each guild has one champion.
    const members = shuffle(rand, [...guilds, ...guilds, ...Array.from({ length: randInt(rand, 3, 6) }, () => guilds[randInt(rand, 0, guilds.length - 1)])])
    const xps = shuffle(rand, Array.from({ length: 90 }, (_, i) => 100 + i * 37)).slice(0, members.length)
    const names = shuffle(rand, [...NAMES])
    const adventurers = members.map((guild, i) => ({ id: i + 1, name: names[i], guild, xp: xps[i] }))
    const expected: Row[] = guilds.map((g) => {
      const best = adventurers.filter((a) => a.guild === g).sort((a, b) => b.xp - a.xp)[0]
      return [g, best.name, best.xp]
    })
    return { data: insert('adventurers', adventurers.map((a) => [a.id, a.name, a.guild, a.xp])), expected }
  },
}
