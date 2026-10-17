import { FLOORS } from '../game/dungeon'
import type { Action, Run } from '../game/run'
import { GameBar, Plate } from '../ui'

type Props = { run: Run; dispatch: (a: Action) => void; onTitle: () => void }

export function MapScreen({ run, dispatch, onTitle }: Props) {
  const floor = FLOORS[run.floor]
  const boss = floor.rooms.length === 1

  return (
    <div className="screen map">
      <GameBar run={run} onTitle={onTitle} />
      <main className="map-grid">
        <section className="map-choice">
          <h1 className="enter">{floor.name}</h1>
          <p className="lead enter">
            {boss
              ? `The last floor. One door, and behind it ${floor.concept}.`
              : `Floor ${run.floor + 1} of ${FLOORS.length}. Both doors test ${floor.concept}. Pick one.`}
          </p>
          <div className={boss ? 'doors doors-one' : 'doors'}>
            {floor.rooms.map((room, door) => (
              <button key={room.id} className="door enter" onClick={() => dispatch({ type: 'enter', door })}>
                <Plate name={floor.plate} alt="" className="door-arch" position={door === 0 ? '50% 22%' : '50% 78%'} eager />
                <strong>{room.title}</strong>
                <span>{room.story}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="descent">
          <h2>The descent</h2>
          <ol>
            {FLOORS.map((f, i) => {
              const done = run.cleared.find((c) => c.floor === i)
              const state = done ? 'done' : i === run.floor ? 'here' : 'ahead'
              return (
                <li key={f.name} className={state}>
                  <span className="pip" />
                  <span className="descent-name">{f.name}</span>
                  <span className="descent-note">
                    {done ? `${f.rooms[done.door].title}, ${done.points} points` : state === 'here' ? 'You are here' : f.concept}
                  </span>
                </li>
              )
            })}
          </ol>
        </aside>
      </main>
    </div>
  )
}
