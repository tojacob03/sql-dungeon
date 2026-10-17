import { mulberry32, pick, randInt, shuffle } from '../prng'
import { insert, type Room, type Row } from '../room'
import { NAMES } from './words'

const BLOCKS = ['A', 'B', 'C', 'D']

export const emptycells: Room = {
  id: 'emptycells',
  title: 'The Empty Cells',
  story: 'You need a cell nobody is in, to hide until the guard passes. Some prisoners are out in the yard and have no cell at all.',
  task: 'Return the id and block of every cell that holds no prisoner.',
  hint: 'LEFT JOIN keeps every cell; cells without a prisoner get NULLs. Beware NOT IN with a list that contains NULL: it matches nothing.',
  orderMatters: false,
  tables: { cells: ['id', 'block', 'is_guarded'], prisoners: ['id', 'name', 'cell_id'] },
  ddl: `CREATE TABLE cells (id int PRIMARY KEY, block text NOT NULL, is_guarded boolean NOT NULL);
CREATE TABLE prisoners (id int PRIMARY KEY, name text NOT NULL, cell_id int REFERENCES cells)`,
  reference: 'SELECT c.id, c.block FROM cells c LEFT JOIN prisoners p ON p.cell_id = c.id WHERE p.id IS NULL',

  generate(seed) {
    const rand = mulberry32(seed)
    const cellCount = randInt(rand, 8, 12)
    const cells = Array.from({ length: cellCount }, (_, i) => ({ id: 100 + i, block: pick(rand, BLOCKS), guarded: rand() < 0.4 }))
    // At least two cells stay empty; one cell holds two prisoners; one prisoner is in the yard (NULL).
    const occupiable = shuffle(rand, cells.map((c) => c.id)).slice(0, cellCount - randInt(rand, 2, 4))
    const cellIds: (number | null)[] = [...occupiable, occupiable[0], null, ...Array.from({ length: randInt(rand, 0, 3) }, () => pick(rand, occupiable))]
    const names = shuffle(rand, [...NAMES])
    const prisoners = shuffle(rand, cellIds).map((cellId, i) => [i + 1, names[i], cellId])
    const taken = new Set(cellIds)
    const expected: Row[] = cells.filter((c) => !taken.has(c.id)).map((c) => [c.id, c.block])
    return {
      data: `${insert('cells', cells.map((c) => [c.id, c.block, c.guarded]))};\n${insert('prisoners', prisoners)}`,
      expected,
    }
  },
}
