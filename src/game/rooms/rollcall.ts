import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'

const SPECIES = ['basilisk', 'bat', 'ghoul', 'goblin', 'imp', 'kobold', 'lich', 'mimic', 'ogre', 'rat', 'slime', 'wraith']

export const rollcall: Room = {
  id: 'rollcall',
  title: 'The Roll Call',
  story: 'A warden keeps a log of every sighting, one line each time. He wants the list of what lives down here, not how often.',
  task: 'Return every species that has been sighted, once each, in alphabetical order.',
  hint: 'DISTINCT removes duplicate rows. ORDER BY on a text column sorts alphabetically.',
  orderMatters: true,
  tables: { sightings: ['id', 'species', 'floor', 'seen_at'] },
  ddl: 'CREATE TABLE sightings (id int PRIMARY KEY, species text NOT NULL, floor int NOT NULL, seen_at time NOT NULL)',
  reference: 'SELECT DISTINCT species FROM sightings ORDER BY species',

  generate(seed) {
    const rand = mulberry32(seed)
    const present = shuffle(rand, [...SPECIES]).slice(0, randInt(rand, 4, 7))
    // Every present species once, then repeats, so a missing DISTINCT always shows.
    const log = shuffle(rand, [...present, present[0], ...Array.from({ length: randInt(rand, 4, 9) }, () => pick(rand, present))])
    const rows = log.map((species, i) => [
      i + 1,
      species,
      randInt(rand, 1, 6),
      // A clock time. taste-skill-ignore
      `${String(randInt(rand, 0, 23)).padStart(2, '0')}:${String(randInt(rand, 0, 59)).padStart(2, '0')}`,
    ])
    const expected: Row[] = [...present].sort().map((s) => [s])
    return { data: insert('sightings', rows), expected }
  },
}
