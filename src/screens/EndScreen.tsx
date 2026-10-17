import { useState } from 'react'
import { FLOORS } from '../game/dungeon'
import { randomSeed } from '../game/grade'
import type { Run } from '../game/run'
import { recordBest } from '../storage'
import { Plate, runLabel } from '../ui'

type Props = { run: Run; onStart: (seed: number, daily: boolean) => void; onTitle: () => void }

export function EndScreen({ run, onStart, onTitle }: Props) {
  const won = run.status === 'won'
  const [best] = useState(() => recordBest(run))
  const [copied, setCopied] = useState(false)
  const floor = FLOORS[run.floor]
  const diedIn = run.room ? floor.rooms[run.room.door].title : floor.name

  const summary = [
    `SQL Dungeon · ${runLabel(run)}`,
    won ? `Walked out with ${run.score} points` : `Torch out on floor ${run.floor + 1} with ${run.score} points`,
    run.cleared.map((c) => (c.wrong === 0 ? '■' : '□')).join(''),
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={won ? 'screen end won' : 'screen end'}>
      <Plate name={won ? 'drawbridge' : floor.plate} alt={won ? 'Plate VII, The Drawbridge, by Piranesi' : `${floor.plateTitle}, by Piranesi`} className="end-arch" eager />
      <main className="end-copy">
        <h1 className="enter">{won ? 'You walked out.' : 'Your torch went out.'}</h1>
        <p className="lead enter">
          {won
            ? `All six floors, ${run.score} points. The stair ended after all.`
            : `On floor ${run.floor + 1}, in ${diedIn}, with ${run.score} points.`}{' '}
          {best > run.score ? `Your best on this ${run.daily ? 'day' : 'seed'} is ${best}.` : 'Your best on this one so far.'}
        </p>

        <ol className="path enter">
          {FLOORS.map((f, i) => {
            const c = run.cleared.find((x) => x.floor === i)
            return (
              <li key={f.name} className={c ? 'done' : i === run.floor && !won ? 'fell' : 'ahead'}>
                <span className="pip" />
                <span>{c ? f.rooms[c.door].title : f.name}</span>
                <span>{c ? `${c.points} points${c.wrong ? `, ${c.wrong} wrong` : ', first try'}${c.hint ? ', hint' : ''}` : i === run.floor && !won ? 'fell here' : ''}</span>
              </li>
            )
          })}
        </ol>

        <div className="end-actions enter">
          <button className="arch-button" onClick={() => onStart(run.daily ? randomSeed() : run.seed, false)}>
            {run.daily ? 'Try a random run' : 'Same seed again'}
          </button>
          {!run.daily && (
            <button className="arch-button quiet" onClick={() => onStart(randomSeed(), false)}>
              New seed
            </button>
          )}
          <button className="text-button" onClick={copy}>
            {copied ? 'Copied' : 'Copy the result'}
          </button>
          <button className="text-button" onClick={onTitle}>
            Back to the title
          </button>
        </div>
      </main>
    </div>
  )
}
