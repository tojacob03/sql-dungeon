import { PostgreSQL, sql as sqlLang } from '@codemirror/lang-sql'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import CodeMirror, { EditorView, keymap, Prec } from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DbClient } from '../db/client'
import { FLOORS, roomSeed } from '../game/dungeon'
import type { Verdict } from '../game/grade'
import { roomPoints, type Action, type Run } from '../game/run'
import type { RunResult } from '../game/sandbox'
import { GameBar, Plate } from '../ui'

// Started with the module, so Postgres is warm by the time the first room opens.
const db = new DbClient()

const editorTheme = [
  EditorView.lineWrapping,
  EditorView.theme({
    '&': { backgroundColor: 'var(--surface)', color: 'var(--ink)', fontSize: '16px' },
    '.cm-content': { fontFamily: 'var(--code)', padding: '16px 0', caretColor: 'var(--ink)' },
    '.cm-gutters': { backgroundColor: 'var(--surface)', color: 'var(--muted)', border: 'none' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'var(--field-2)' },
    '.cm-tooltip': { border: 'none', backgroundColor: 'var(--bg)', color: 'var(--ink)' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--ink)', color: 'var(--bg)' },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, fontWeight: '600' },
      { tag: [tags.string, tags.number, tags.bool, tags.null], color: 'var(--muted)' },
      { tag: tags.comment, color: 'var(--muted)', fontStyle: 'italic' },
    ]),
  ),
]

type Props = { run: Run; dispatch: (a: Action) => void; onTitle: () => void }

export function RoomScreen({ run, dispatch, onTitle }: Props) {
  const floor = FLOORS[run.floor]
  const { door, wrong, hint } = run.room!
  const room = floor.rooms[door]
  const seed = roomSeed(run.seed, run.floor, door)
  const last = run.floor === FLOORS.length - 1

  const [query, setQuery] = useState(`SELECT * FROM ${Object.keys(room.tables)[0]}`)
  const [result, setResult] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)
  const [askHint, setAskHint] = useState(false)
  const [opened, setOpened] = useState(false)

  async function act(kind: 'run' | 'door') {
    if (busy || !query.trim()) return
    setBusy(true)
    setResult(null)
    setVerdict(null)
    try {
      if (kind === 'run') {
        setResult(await db.run(room.id, seed, query))
      } else {
        const v = await db.grade(room.id, seed, query)
        if (v.passed) setOpened(true)
        // A query that doesn't even run here is a typo, not a wrong door: no torch for that.
        else if (v.seeds[0].error) setResult({ ok: false, error: v.seeds[0].error })
        else {
          setVerdict(v)
          dispatch({ type: 'fail' })
        }
      }
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setBusy(false)
    }
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
      ...editorTheme,
    ],
    [room],
  )

  return (
    <div className="screen room">
      <GameBar run={run} onTitle={onTitle}>
        <button className="text-button gamebar-back" onClick={() => dispatch({ type: 'leave' })}>
          Back to the doors
        </button>
      </GameBar>

      <main className="room-grid">
        <section className="room-brief">
          <Plate name={floor.plate} alt={`${floor.plateTitle}, etching by Piranesi`} className="room-arch" position={door === 0 ? '50% 22%' : '50% 78%'} eager />
          <h1 className="enter">{room.title}</h1>
          <p className="room-story enter">{room.story}</p>
          <p className="room-task enter">{room.task}</p>
          <div className="schema enter">
            {Object.entries(room.tables).map(([table, columns]) => (
              <code key={table}>
                {table} ({columns.join(', ')})
              </code>
            ))}
          </div>
          <div className="hint enter">
            {hint ? (
              <p className="hint-text">{room.hint}</p>
            ) : askHint ? (
              <p>
                Burn a torch for the hint?{' '}
                <button className="text-button" onClick={() => dispatch({ type: 'hint' })}>
                  Yes, burn it
                </button>{' '}
                <button className="text-button" onClick={() => setAskHint(false)}>
                  No
                </button>
              </p>
            ) : (
              <button className="text-button" onClick={() => setAskHint(true)}>
                Read the hint, for a torch
              </button>
            )}
          </div>
        </section>

        <section className="room-work">
          <div className="editor" data-ui>
            <CodeMirror value={query} onChange={setQuery} extensions={extensions} theme="none" minHeight="168px" aria-label="SQL query" />
          </div>
          <div className="room-actions">
            <button className="arch-button quiet" onClick={() => act('run')} disabled={busy}>
              Run it here
            </button>
            <button className="arch-button" onClick={() => act('door')} disabled={busy}>
              Try the door
            </button>
            <span className="room-status" aria-live="polite">
              {busy ? 'The dungeon is thinking…' : wrong > 0 ? `${wrong} wrong ${wrong === 1 ? 'door' : 'doors'} here so far` : '⌘ or Ctrl + Enter runs it here, for free'}
            </span>
          </div>

          {verdict && (
            <div className="verdict" role="status">
              <p className="verdict-head">The door stays shut. A torch burns out.</p>
              <ul className="verdict-list">
                {verdict.seeds.map((v, i) => (
                  <li key={v.seed}>
                    <span className={v.passed ? 'pip lit' : 'pip'} /> {v.hidden ? `hidden room ${i}` : 'this room'}: {v.passed ? 'right' : 'wrong'}
                    {v.error && ` (${v.error})`}
                  </li>
                ))}
              </ul>
              {verdict.seeds[0].passed && <p>Right here, wrong elsewhere. The query has to hold for any data, not just these rows.</p>}
            </div>
          )}
          {result && <Register result={result} />}
        </section>
      </main>

      {opened && (
        <div className="opened" role="dialog" aria-modal="true" aria-labelledby="opened-title">
          <Plate name={last ? 'drawbridge' : FLOORS[run.floor + 1].plate} alt="" className="opened-arch" eager />
          <div className="opened-copy">
            <h2 id="opened-title">{last ? 'You walked out.' : 'The door opens.'}</h2>
            <p className="lead">
              {roomPoints(run.floor, wrong)} points. {wrong === 0 ? 'First try, so a torch is lit again.' : 'No torch back this time.'}
            </p>
            <button className="arch-button light" autoFocus onClick={() => dispatch({ type: 'clear' })}>
              {last ? 'See the run' : `Down to ${FLOORS[run.floor + 1].name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Register({ result }: { result: RunResult }) {
  if (!result.ok) return <pre className="error">{result.error}</pre>
  const shown = result.rows.slice(0, 50)
  return (
    <div className="register" data-ui>
      <p>
        {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
        {result.rows.length > shown.length && `, first ${shown.length} shown`}
      </p>
      <div className="register-scroll">
        <table>
          <thead>
            <tr>
              {result.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td key={j}>{v === null ? 'NULL' : String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
