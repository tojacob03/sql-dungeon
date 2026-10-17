import { FLOORS } from './game/dungeon'
import type { Run } from './game/run'

// Per-browser save game. Storage can be missing or blocked; the game then just doesn't remember.
const RUN = 'sql-dungeon:run'
const BEST = 'sql-dungeon:best'

export function loadRun(): Run | null {
  try {
    const run = JSON.parse(localStorage.getItem(RUN) ?? 'null') as Run | null
    return run && Number.isInteger(run.seed) && FLOORS[run.floor] && Array.isArray(run.cleared) ? run : null
  } catch {
    return null
  }
}

export function saveRun(run: Run | null) {
  try {
    if (run) localStorage.setItem(RUN, JSON.stringify(run))
    else localStorage.removeItem(RUN)
  } catch {
    // ignore
  }
}

// Best score per seed; returns the best including this run.
export function recordBest(run: Run): number {
  try {
    const best = JSON.parse(localStorage.getItem(BEST) ?? '{}') as Record<string, number>
    const top = Math.max(best[run.seed] ?? 0, run.score)
    localStorage.setItem(BEST, JSON.stringify({ ...best, [run.seed]: top }))
    return top
  } catch {
    return run.score
  }
}
