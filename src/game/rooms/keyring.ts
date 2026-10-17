import { mulberry32, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const KEY_NAMES = ['bent key', 'black key', 'bone key', 'brass key', 'chapel key', 'cold key', 'crooked key', 'green key', 'long key', 'small key', 'tin key', 'twin key']
const DOORS = ['Bridge gate', 'Chain door', 'Cistern hatch', 'Gallows door', 'Iron grille', 'Tower door', 'Well cover', 'Wheel door']

export const keyring: Room = {
  id: 'keyring',
  title: 'The Keyring',
  story: 'A ring of keys hangs from a pier, each tagged with a number. The numbers are door ids. Some tags are blank.',
  task: "Return each key's name with the label of the door it opens. Keys that open nothing are left out.",
  hint: 'JOIN doors ON doors.id = keys.door_id pairs each key with its door. A plain JOIN drops keys without a match.',
  orderMatters: false,
  tables: { keys: ['id', 'name', 'door_id'], doors: ['id', 'label', 'floor'] },
  ddl: `CREATE TABLE doors (id int PRIMARY KEY, label text NOT NULL, floor int NOT NULL);
CREATE TABLE keys (id int PRIMARY KEY, name text NOT NULL, door_id int REFERENCES doors)`,
  reference: 'SELECT k.name, d.label FROM keys k JOIN doors d ON d.id = k.door_id',

  generate(seed) {
    const rand = mulberry32(seed)
    const doorLabels = shuffle(rand, [...DOORS]).slice(0, randInt(rand, 4, 6))
    // Door ids don't start at 1, so key ids and door ids never line up by accident.
    let id = 10
    const doors = doorLabels.map((label) => ({ id: (id += randInt(rand, 1, 4)), label, floor: randInt(rand, 1, 6) }))
    const names = shuffle(rand, [...KEY_NAMES])
    const keyCount = randInt(rand, 6, 9)
    // First key has no door (a plain LEFT JOIN shows it), second and third share one.
    const keys = Array.from({ length: keyCount }, (_, i) => ({
      id: i + 1,
      name: names[i],
      doorId: i === 0 ? null : i <= 2 ? doors[0].id : rand() < 0.2 ? null : doors[randInt(rand, 0, doors.length - 1)].id,
    }))
    const shuffled = shuffle(rand, keys).map((k, i) => ({ ...k, id: i + 1 }))
    const label = new Map(doors.map((d) => [d.id, d.label]))
    const expected: Row[] = shuffled.filter((k) => k.doorId !== null).map((k) => [k.name, label.get(k.doorId!)!])
    return {
      data: `${insert('doors', doors.map((d) => [d.id, d.label, d.floor]))};\n${insert('keys', shuffled.map((k) => [k.id, k.name, k.doorId]))}`,
      expected,
    }
  },
}
