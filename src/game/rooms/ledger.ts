import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const ADVENTURERS = ['Aldous', 'Brigid', 'Corvin', 'Dagny', 'Edric', 'Fennel', 'Gisela']
const ITEMS = ['silver ring', 'jade idol', 'rusty crown', 'bone flute', 'gold tooth', 'amber eye', 'iron key', 'saint relic', 'pearl', 'map scrap']

export const ledger: Room = {
  id: 'ledger',
  title: 'The Loot Ledger',
  story: 'The toll-keeper weighs every pack before the wheel turns. One line per item, one total per head.',
  task: 'Return each adventurer with the total value of the loot they carry.',
  hint: 'GROUP BY adventurer makes one row per adventurer; sum(value) adds up each group.',
  orderMatters: false,
  tables: { loot: ['id', 'adventurer', 'item', 'value'] },
  ddl: 'CREATE TABLE loot (id int PRIMARY KEY, adventurer text NOT NULL, item text NOT NULL, value int NOT NULL)',
  reference: 'SELECT adventurer, sum(value) FROM loot GROUP BY adventurer',

  generate(seed) {
    const rand = mulberry32(seed)
    const party = shuffle(rand, [...ADVENTURERS]).slice(0, randInt(rand, 3, 5))
    // Everyone carries at least two items, so count(*) and max() give wrong totals.
    const owners = shuffle(rand, [...party, ...party, ...Array.from({ length: randInt(rand, 3, 7) }, () => pick(rand, party))])
    const loot = owners.map((adventurer, i) => ({ id: i + 1, adventurer, item: pick(rand, ITEMS), value: randInt(rand, 3, 90) }))
    const totals = new Map<string, number>()
    for (const l of loot) totals.set(l.adventurer, (totals.get(l.adventurer) ?? 0) + l.value)
    const expected: Row[] = [...totals]
    return { data: insert('loot', loot.map((l) => [l.id, l.adventurer, l.item, l.value])), expected }
  },
}
