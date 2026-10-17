import { PostgreSQL, sql as sqlLang } from '@codemirror/lang-sql'
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DbClient } from './db/client'
import { randomSeed, type Verdict } from './game/grade'
import type { Row } from './game/room'
import { guardroom as room } from './game/rooms/guardroom'
import type { RunResult } from './game/sandbox'

const db = new DbClient()

function initialSeed() {
  const fromUrl = Number(new URLSearchParams(location.search).get('seed'))
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : randomSeed()
}

export default function App() {
  const [seed, setSeed] = useState(initialSeed)
  const [query, setQuery] = useState('SELECT * FROM monsters')
  const [result, setResult] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)

  async function act(kind: 'run' | 'grade') {
    if (busy || !query.trim()) return
    setBusy(true)
    setResult(null)
    setVerdict(null)
    try {
      if (kind === 'run') {
        setResult(await db.run(seed, query))
      } else {
        setVerdict(await db.grade(seed, query))
      }
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  function newSeed() {
    const next = randomSeed()
    history.replaceState(null, '', `?seed=${next}`)
    setSeed(next)
    setResult(null)
    setVerdict(null)
  }

  const actRef = useRef(act)
  useEffect(() => {
    actRef.current = act
  })
  const extensions = useMemo(
    () => [
      // defaultTable: without it lang-sql completes bare column names for no table.
      sqlLang({ dialect: PostgreSQL, schema: room.tables, defaultTable: Object.keys(room.tables)[0], upperCaseKeywords: true }),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (actRef.current('run'), true) }])),
    ],
    [],
  )

  return (
    <main>
      <header>
        <span>SQL Dungeon · Floor {room.floor}</span>
        <span>
          seed {seed} <button onClick={newSeed}>new seed</button>
        </span>
      </header>

      <h1>{room.title}</h1>
      <p className="story">{room.story}</p>
      <p className="task">{room.task}</p>

      <section className="schema">
        {Object.entries(room.tables).map(([table, columns]) => (
          <code key={table}>
            {table}({columns.join(', ')})
          </code>
        ))}
      </section>

      <CodeMirror value={query} onChange={setQuery} extensions={extensions} theme="dark" height="120px" />

      <div className="actions">
        <button onClick={() => act('run')} disabled={busy}>
          Run <kbd>⌘↵</kbd>
        </button>
        <button onClick={() => act('grade')} disabled={busy} className="door">
          Try the door
        </button>
        {busy && <span className="muted">working…</span>}
      </div>

      {verdict && <VerdictView verdict={verdict} />}
      {result && <ResultView result={result} />}
    </main>
  )
}

function VerdictView({ verdict }: { verdict: Verdict }) {
  return (
    <section className={verdict.passed ? 'verdict open' : 'verdict closed'}>
      <strong>{verdict.passed ? 'The door swings open.' : 'The door stays shut.'}</strong>
      <ul>
        {verdict.seeds.map((v, i) => (
          <li key={v.seed}>
            {v.passed ? '✓' : '✗'} {v.hidden ? `hidden room ${i}` : 'this room'}
            {v.error && <span className="muted"> ({v.error})</span>}
          </li>
        ))}
      </ul>
      {!verdict.passed && verdict.seeds[0].passed && (
        <p className="muted">Right answer here, wrong elsewhere: your query has to work for any monsters, not just these.</p>
      )}
    </section>
  )
}

function ResultView({ result }: { result: RunResult }) {
  if (!result.ok) return <pre className="error">{result.error}</pre>
  return (
    <section>
      <p className="muted">{result.rows.length} rows</p>
      <table>
        <thead>
          <tr>
            {result.columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row: Row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j}>{v === null ? 'NULL' : String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
