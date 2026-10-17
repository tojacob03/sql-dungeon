import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const WEAPON_NAMES = [
  'Rustfang', "Widow's Kiss", 'Grimbite', 'Old Honest', 'Gutspike', 'Mournblade', 'Splinter',
  'Last Word', 'Hollowpoint', 'Gravel', "Beggar's Edge", 'Nightjar', 'Cinder', 'Tollkeeper',
  'Bonecleaver', 'Whisper', 'Ironroot', 'Saint Agnes', 'Thornback', 'Lull',
]
const OTHER_KINDS = ['mace', 'bow', 'dagger', 'spear']

// Each seed has at least one of every case, so a misplaced OR or a missing NOT fails.
const FIXED = [
  { kind: 'sword', cursed: false },
  { kind: 'axe', cursed: false },
  { kind: 'sword', cursed: true },
  { kind: 'axe', cursed: true },
  { kind: 'mace', cursed: false },
]

export const armory: Room = {
  id: 'armory',
  title: 'The Armory',
  story: 'Racks of blades in the dark. Some hum softly. The quartermaster will only hand over what is safe to swing.',
  task: 'Return the name and damage of every sword or axe that is not cursed.',
  hint: 'IN (...) checks a list of values. Careful: AND binds tighter than OR, so "a OR b AND c" is not "(a OR b) AND c".',
  orderMatters: false,
  tables: { weapons: ['id', 'name', 'kind', 'damage', 'weight', 'is_cursed'] },
  ddl: 'CREATE TABLE weapons (id int PRIMARY KEY, name text NOT NULL, kind text NOT NULL, damage int NOT NULL, weight int NOT NULL, is_cursed boolean NOT NULL)',
  reference: "SELECT name, damage FROM weapons WHERE kind IN ('sword', 'axe') AND NOT is_cursed",

  generate(seed) {
    const rand = mulberry32(seed)
    const random = Array.from({ length: randInt(rand, 4, 8) }, () => ({
      kind: pick(rand, ['sword', 'axe', ...OTHER_KINDS]),
      cursed: rand() < 0.35,
    }))
    const names = shuffle(rand, [...WEAPON_NAMES])
    const weapons = shuffle(rand, [...FIXED, ...random]).map((w, i) => ({
      ...w,
      id: i + 1,
      name: names[i],
      damage: randInt(rand, 3, 30),
      weight: randInt(rand, 1, 12),
    }))
    const expected: Row[] = weapons
      .filter((w) => (w.kind === 'sword' || w.kind === 'axe') && !w.cursed)
      .map((w) => [w.name, w.damage])
    return { data: insert('weapons', weapons.map((w) => [w.id, w.name, w.kind, w.damage, w.weight, w.cursed])), expected }
  },
}
