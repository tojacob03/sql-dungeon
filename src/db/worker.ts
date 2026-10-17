import { grade } from '../game/grade'
import { guardroom } from '../game/rooms/guardroom'
import { createSandbox, runOnSeed } from '../game/sandbox'

export type Request = { id: number; kind: 'run' | 'grade'; seed: number; sql: string }

const ready = createSandbox().then((db) => {
  postMessage({ ready: true })
  return db
})

// One request at a time: concurrent runs would interleave their BEGIN/ROLLBACK.
let queue: Promise<unknown> = ready
self.onmessage = (e: MessageEvent<Request>) => {
  const { id, kind, seed, sql } = e.data
  queue = queue.then(async () => {
    const db = await ready
    const run = (s: number) => runOnSeed(db, guardroom, s, sql)
    postMessage({ id, result: kind === 'run' ? await run(seed) : await grade(guardroom, seed, run) })
  })
}
