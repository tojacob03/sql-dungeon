export type Value = string | number | boolean | null
export type Row = Value[]

export interface Room {
  id: string
  title: string
  story: string
  task: string
  // Costs a torch to read.
  hint: string
  // Only true when the task asks for an order.
  orderMatters: boolean
  // Table -> columns, for the schema panel and editor autocomplete.
  tables: Record<string, string[]>
  ddl: string
  // Same seed, same room: INSERT statements plus the expected result, computed in JS.
  generate(seed: number): { data: string; expected: Row[] }
  // Reference solution in SQL. Tests check it against `expected` on many seeds.
  reference: string
}

export const sqlString = (s: string) => `'${s.replaceAll("'", "''")}'`

const sqlValue = (v: Value) => (v === null ? 'NULL' : typeof v === 'string' ? sqlString(v) : String(v))

export const insert = (table: string, rows: Row[]) =>
  `INSERT INTO ${table} VALUES\n  ${rows.map((r) => `(${r.map(sqlValue).join(', ')})`).join(',\n  ')}`
