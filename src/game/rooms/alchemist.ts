import { mulberry32, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const POTIONS = [
  'Gravewater', 'Moth Milk', 'Saint Elixir', 'Black Draught', 'Fogbottle', 'Ember Tonic', 'Lantern Oil',
  'Bitter Mercy', 'Hollow Brew', 'Salt Tears', 'Ash Cordial', 'Nine Lives', 'Quiet Syrup', 'Thornwine',
]

export const alchemist: Room = {
  id: 'alchemist',
  title: "The Alchemist's Shelf",
  story: 'Bottles crowd a sagging plank. The alchemist sneers at anything ordinary: only the better-than-average ones are worth stealing.',
  task: 'Return the name and potency of every potion stronger than the average potion.',
  hint: 'A subquery in parentheses can stand where a value would: WHERE potency > (SELECT avg(potency) FROM potions).',
  orderMatters: false,
  tables: { potions: ['id', 'name', 'potency', 'shelf'] },
  ddl: 'CREATE TABLE potions (id int PRIMARY KEY, name text NOT NULL, potency int NOT NULL, shelf int NOT NULL)',
  reference: 'SELECT name, potency FROM potions WHERE potency > (SELECT avg(potency) FROM potions)',

  generate(seed) {
    const rand = mulberry32(seed)
    const names = shuffle(rand, [...POTIONS]).slice(0, randInt(rand, 7, 12))
    const potencies = names.slice(1).map(() => randInt(rand, 12, 99))
    // One potion sits exactly on the average, to punish >=. Make the others' sum divisible
    // by their count; adding their mean then leaves the mean unchanged.
    const rest = potencies.length
    const max = potencies.indexOf(Math.max(...potencies))
    potencies[max] -= potencies.reduce((s, p) => s + p, 0) % rest
    potencies.splice(randInt(rand, 0, rest), 0, potencies.reduce((s, p) => s + p, 0) / rest)
    const potions = names.map((name, i) => ({ id: i + 1, name, potency: potencies[i], shelf: randInt(rand, 1, 4) }))
    const n = potions.length
    const sum = potions.reduce((s, p) => s + p.potency, 0)
    // potency > sum / n, compared in integers to stay exact like Postgres' numeric avg.
    const expected: Row[] = potions.filter((p) => p.potency * n > sum).map((p) => [p.name, p.potency])
    return { data: insert('potions', potions.map((p) => [p.id, p.name, p.potency, p.shelf])), expected }
  },
}
