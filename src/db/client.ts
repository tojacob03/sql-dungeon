import type { Verdict } from '../game/grade'
import type { RunResult } from '../game/sandbox'
import type { Request } from './worker'

// statement_timeout never fires in PGlite (docs/spike-sandbox.md), so an endless
// query is stopped by killing the worker and starting a fresh database.
const TIMEOUT_MS = { run: 4000, grade: 10000 }

type Pending = { resolve: (v: never) => void; reject: (e: Error) => void }

export class DbClient {
  private worker!: Worker
  private ready!: Promise<void>
  private pending = new Map<number, Pending>()
  private nextId = 0

  constructor() {
    this.spawn()
  }

  run = (seed: number, sql: string) => this.call<RunResult>('run', seed, sql)
  grade = (seed: number, sql: string) => this.call<Verdict>('grade', seed, sql)

  private spawn() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    this.ready = new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.ready) return resolve()
        this.pending.get(e.data.id)?.resolve(e.data.result as never)
        this.pending.delete(e.data.id)
      }
    })
  }

  private async call<T>(kind: Request['kind'], seed: number, sql: string): Promise<T> {
    await this.ready
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => this.restart(), TIMEOUT_MS[kind])
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(timer), resolve(v)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      })
      this.worker.postMessage({ id, kind, seed, sql } satisfies Request)
    })
  }

  private restart() {
    this.worker.terminate()
    const error = new Error('The query ran too long, so the dungeon was reset. Check for an endless query.')
    for (const p of this.pending.values()) p.reject(error)
    this.pending.clear()
    this.spawn()
  }
}
