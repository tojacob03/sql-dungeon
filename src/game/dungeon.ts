import { mulberry32 } from './prng'
import type { Room } from './room'
import { alchemist } from './rooms/alchemist'
import { armory } from './rooms/armory'
import { barracks } from './rooms/barracks'
import { champions } from './rooms/champions'
import { emptycells } from './rooms/emptycells'
import { endlessstair } from './rooms/endlessstair'
import { guardroom } from './rooms/guardroom'
import { keyring } from './rooms/keyring'
import { ledger } from './rooms/ledger'
import { rollcall } from './rooms/rollcall'
import { treasury } from './rooms/treasury'

export type Floor = {
  name: string
  concept: string
  // Piranesi plate in public/plates/.
  plate: string
  plateTitle: string
  rooms: Room[]
}

// Each floor offers two doors and the player picks one; the last floor has only the boss.
export const FLOORS: Floor[] = [
  { name: 'The Great Square', concept: 'SELECT and WHERE', plate: 'great-square', plateTitle: 'Plate IV, The Great Square', rooms: [guardroom, armory] },
  { name: 'The Staircase', concept: 'ORDER BY, LIMIT and DISTINCT', plate: 'staircase', plateTitle: 'Plate VIII, Staircase with Trophies', rooms: [treasury, rollcall] },
  { name: 'The Giant Wheel', concept: 'GROUP BY and HAVING', plate: 'giant-wheel', plateTitle: 'Plate IX, The Giant Wheel', rooms: [ledger, barracks] },
  { name: 'The Chained Pier', concept: 'JOIN', plate: 'chained-pier', plateTitle: 'Plate XVI, The Pier with Chains', rooms: [keyring, emptycells] },
  { name: 'The Sawhorse', concept: 'Subqueries', plate: 'sawhorse', plateTitle: 'Plate XII, The Sawhorse', rooms: [alchemist, champions] },
  { name: 'The Drawbridge', concept: 'WITH RECURSIVE', plate: 'drawbridge', plateTitle: 'Plate VII, The Drawbridge', rooms: [endlessstair] },
]

export const ROOMS: Record<string, Room> = Object.fromEntries(FLOORS.flatMap((f) => f.rooms).map((r) => [r.id, r]))

// The data seed of one room in one run: same run seed, same rooms.
export function roomSeed(runSeed: number, floor: number, door: number): number {
  return 1 + Math.floor(mulberry32(runSeed * 31 + floor * 7919 + door * 104729)() * 999_999)
}

export const dailySeed = (date = new Date()) =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
