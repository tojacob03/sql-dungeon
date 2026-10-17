import { ROOMS } from '../game/dungeon'
import { grade } from '../game/grade'
import { createSandbox, runOnSeed } from '../game/sandbox'

export type Request = { id: number; kind: 'run' | 'grade'; roomId: string; seed: number; sql: string }

const ready = createSandbox().then((db) => {
  postMessage({ ready: true })
  return db
})

// One request at a time: concurrent runs would interleave their BEGIN/ROLLBACK.
let queue: Promise<unknown> = ready
self.onmessage = (e: MessageEvent<Request>) => {
  const { id, kind, roomId, seed, sql } = e.data
  const room = ROOMS[roomId]
  queue = queue.then(async () => {
    const db = await ready
    const run = (s: number) => runOnSeed(db, room, s, sql)
    postMessage({ id, result: kind === 'run' ? await run(seed) : await grade(room, seed, run) })
  })
}
