import { describe, expect, it } from 'vitest'
import { FLOORS, roomSeed } from './dungeon'
import { MAX_TORCHES, newRun, roomPoints, step, type Action, type Run } from './run'

const play = (run: Run, ...actions: Action[]) => actions.reduce(step, run)

describe('run', () => {
  it('clears every floor to win, with torches left counted in', () => {
    let run = newRun(1, false)
    for (let f = 0; f < FLOORS.length; f++) run = play(run, { type: 'enter', door: 0 }, { type: 'clear' })
    expect(run.status).toBe('won')
    expect(run.cleared).toHaveLength(FLOORS.length)
    const roomTotal = FLOORS.reduce((s, _, f) => s + roomPoints(f, 0), 0)
    expect(run.score).toBe(roomTotal + MAX_TORCHES * 100)
  })

  it('burns a torch per wrong door and per hint, and ends the run at zero', () => {
    let run = play(newRun(1, false), { type: 'enter', door: 1 }, { type: 'hint' }, { type: 'hint' })
    expect(run.torches).toBe(MAX_TORCHES - 1)
    run = play(run, { type: 'fail' }, { type: 'fail' })
    expect(run.status).toBe('room')
    run = play(run, { type: 'fail' })
    expect(run.status).toBe('dead')
    expect(play(run, { type: 'clear' })).toBe(run)
  })

  it('gives a torch back for a first-try door, never above the maximum', () => {
    const run = play(newRun(1, false), { type: 'enter', door: 0 }, { type: 'fail' }, { type: 'clear' })
    expect(run.torches).toBe(MAX_TORCHES - 1)
    expect(play(run, { type: 'enter', door: 0 }, { type: 'clear' }).torches).toBe(MAX_TORCHES)
    expect(play(newRun(1, false), { type: 'enter', door: 0 }, { type: 'clear' }).torches).toBe(MAX_TORCHES)
  })

  it('scores deeper floors higher and wrong doors lower', () => {
    expect(roomPoints(0, 0)).toBe(100)
    expect(roomPoints(5, 0)).toBe(600)
    expect(roomPoints(0, 1)).toBe(80)
    expect(roomPoints(0, 9)).toBe(20)
  })

  it('ignores doors that do not exist, like a second door on the boss floor', () => {
    const run = newRun(1, false)
    expect(step(run, { type: 'enter', door: 2 })).toBe(run)
  })

  it('gives each room of a run its own stable data seed', () => {
    expect(roomSeed(7, 0, 0)).toBe(roomSeed(7, 0, 0))
    expect(new Set([roomSeed(7, 0, 0), roomSeed(7, 0, 1), roomSeed(7, 1, 0), roomSeed(8, 0, 0)]).size).toBe(4)
  })
})
