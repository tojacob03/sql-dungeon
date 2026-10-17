import { FLOORS } from './dungeon'

export const MAX_TORCHES = 4

export type Cleared = { floor: number; door: number; wrong: number; hint: boolean; points: number }

export type Run = {
  seed: number
  daily: boolean
  floor: number
  torches: number
  score: number
  cleared: Cleared[]
  // The room being played: which door on the current floor, and how it is going.
  room: { door: number; wrong: number; hint: boolean } | null
  status: 'map' | 'room' | 'dead' | 'won'
}

export type Action =
  | { type: 'enter'; door: number }
  | { type: 'hint' }
  | { type: 'fail' }
  | { type: 'clear' }
  | { type: 'leave' }

export const newRun = (seed: number, daily: boolean): Run => ({
  seed,
  daily,
  floor: 0,
  torches: MAX_TORCHES,
  score: 0,
  cleared: [],
  room: null,
  status: 'map',
})

// Deeper floors are worth more; every wrong door costs a fifth, down to a fifth.
export const roomPoints = (floor: number, wrong: number) => Math.max(1, 5 - wrong) * 20 * (floor + 1)

export function step(run: Run, action: Action): Run {
  if (run.status === 'dead' || run.status === 'won') return run
  switch (action.type) {
    case 'enter':
      if (run.status !== 'map' || !FLOORS[run.floor].rooms[action.door]) return run
      return { ...run, status: 'room', room: { door: action.door, wrong: 0, hint: false } }
    case 'leave':
      // Back to the map to pick the other door; torches already spent stay spent.
      return run.status === 'room' ? { ...run, status: 'map', room: null } : run
    case 'hint':
    case 'fail': {
      if (!run.room || (action.type === 'hint' && run.room.hint)) return run
      const torches = run.torches - 1
      const room = action.type === 'hint' ? { ...run.room, hint: true } : { ...run.room, wrong: run.room.wrong + 1 }
      return { ...run, torches, room, status: torches <= 0 ? 'dead' : run.status }
    }
    case 'clear': {
      if (!run.room) return run
      const { door, wrong, hint } = run.room
      const points = roomPoints(run.floor, wrong)
      const cleared = [...run.cleared, { floor: run.floor, door, wrong, hint, points }]
      // A door opened on the first try gives a torch back.
      const torches = Math.min(MAX_TORCHES, run.torches + (wrong === 0 ? 1 : 0))
      const last = run.floor === FLOORS.length - 1
      return {
        ...run,
        cleared,
        torches,
        score: run.score + points + (last ? torches * 100 : 0),
        floor: last ? run.floor : run.floor + 1,
        room: null,
        status: last ? 'won' : 'map',
      }
    }
  }
}
