import { useEffect, useState } from 'react'
import { newRun, step, type Action, type Run } from './game/run'
import { EndScreen } from './screens/EndScreen'
import { MapScreen } from './screens/MapScreen'
import { RoomScreen } from './screens/RoomScreen'
import { Title } from './screens/Title'
import { loadRun, saveRun } from './storage'

// A seed in the link someone shared, read once on load.
const linkSeed = Number(new URLSearchParams(location.search).get('seed'))
const sharedSeed = Number.isInteger(linkSeed) && linkSeed > 0 ? linkSeed : null

export default function App() {
  const [run, setRun] = useState<Run | null>(loadRun)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    saveRun(run)
  }, [run])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [playing, run?.status, run?.floor])

  const dispatch = (action: Action) => setRun((r) => r && step(r, action))
  const start = (seed: number, daily: boolean) => {
    history.replaceState(null, '', daily ? location.pathname : `?seed=${seed}`)
    setRun(newRun(seed, daily))
    setPlaying(true)
  }
  const toTitle = () => setPlaying(false)

  if (!playing || !run) {
    const unfinished = run && (run.status === 'map' || run.status === 'room') ? run : null
    return <Title onStart={start} sharedSeed={sharedSeed} unfinished={unfinished} onContinue={() => setPlaying(true)} />
  }
  if (run.status === 'dead' || run.status === 'won') {
    return <EndScreen run={run} onStart={start} onTitle={toTitle} />
  }
  if (run.status === 'room' && run.room) {
    return <RoomScreen key={`${run.floor}-${run.room.door}`} run={run} dispatch={dispatch} onTitle={toTitle} />
  }
  return <MapScreen run={run} dispatch={dispatch} onTitle={toTitle} />
}
