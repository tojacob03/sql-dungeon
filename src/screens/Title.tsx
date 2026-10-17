import { useEffect, useState } from 'react'
import { dailySeed, FLOORS } from '../game/dungeon'
import { randomSeed } from '../game/grade'
import type { Run } from '../game/run'
import { dateLabel, GITHUB, Plate, Torches, useReveal } from '../ui'

type Props = {
  onStart: (seed: number, daily: boolean) => void
  sharedSeed: number | null
  unfinished: Run | null
  onContinue: () => void
}

const CREDITS = [
  ['Plate IV, The Great Square', 'https://commons.wikimedia.org/w/index.php?curid=100981572'],
  ['Plate VIII, Staircase with Trophies', 'https://commons.wikimedia.org/w/index.php?curid=100981624'],
  ['Plate IX, The Giant Wheel', 'https://commons.wikimedia.org/w/index.php?curid=100981631'],
  ['Plate XVI, The Pier with Chains', 'https://commons.wikimedia.org/w/index.php?curid=100981663'],
  ['Plate XII, The Sawhorse', 'https://commons.wikimedia.org/w/index.php?curid=100981661'],
  ['Plate VII, The Drawbridge', 'https://commons.wikimedia.org/w/index.php?curid=100981622'],
]

export function Title({ onStart, sharedSeed, unfinished, onContinue }: Props) {
  const today = dailySeed()
  const [opened, setOpened] = useState(false)
  useReveal()
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpened(true))
    return () => cancelAnimationFrame(t)
  }, [])
  const descend = () => onStart(sharedSeed ?? randomSeed(), false)

  return (
    <div className="title">
      <section className="hero">
        <nav className="hero-nav">
          <span className="wordmark">SQL Dungeon</span>
          <span className="hero-links">
            <a href="#how">How it works</a>
            <a href="#floors">Floors</a>
            <a href={GITHUB}>Source</a>
          </span>
        </nav>
        <div className="hero-arch" aria-hidden="true">
          <div className={opened ? 'shutter is-in' : 'shutter'}>
            <Plate name="drawbridge" alt="" className="drift" eager />
          </div>
        </div>
        <div className="hero-copy">
          <h1>Write your way out.</h1>
          <p className="lead">
            A roguelike through Piranesi's imaginary prisons. Each door opens to one SQL query that must also work in rooms you never see.
          </p>
          <div className="hero-actions">
            {unfinished ? (
              <button className="arch-button" onClick={onContinue}>
                Continue on floor {unfinished.floor + 1}
              </button>
            ) : (
              <button className="arch-button" onClick={descend}>
                {sharedSeed ? `Descend into run ${sharedSeed}` : 'Descend'}
              </button>
            )}
            {unfinished && (
              <button className="arch-button quiet" onClick={descend}>
                Start a new run
              </button>
            )}
            <button className="text-button" onClick={() => onStart(today, true)}>
              Today's dungeon, {dateLabel(today)}
            </button>
          </div>
        </div>
      </section>

      <section id="how" className="how">
        <div className="field field-1">
          <h2 className="reveal">How a door opens</h2>
          <div className="mini reveal" data-ui>
            <p className="mini-task">Return the name and hp of every monster that is awake and has more than 10 hp.</p>
            <table>
              <tbody>
                <tr><td>Ulla</td><td>goblin</td><td>40</td><td>true</td></tr>
                <tr><td>Snikkit</td><td>goblin</td><td>5</td><td>true</td></tr>
                <tr><td>Mirelle</td><td>slime</td><td>34</td><td>false</td></tr>
              </tbody>
            </table>
          </div>
          <p className="clause reveal">First you read the room, built fresh from a seed.</p>
        </div>
        <div className="field field-2">
          <div className="mini reveal" data-ui>
            <pre><code>{'SELECT name, hp\nFROM monsters\nWHERE is_awake\n  AND hp > 10'}</code></pre>
          </div>
          <p className="clause reveal">Then you write one SELECT. It changes nothing.</p>
        </div>
        <div className="field field-3">
          <div className="mini reveal" data-ui>
            <ul className="verdict-list">
              <li><span className="pip lit" /> this room: right</li>
              <li><span className="pip lit" /> hidden room 1: right</li>
              <li><span className="pip" /> hidden room 2: wrong</li>
            </ul>
          </div>
          <p className="clause reveal">It also runs in two rooms you never see.</p>
        </div>
        <div className="field field-4">
          <div className="mini reveal" data-ui>
            <p className="mini-door">The door stays shut.</p>
            <Torches count={3} />
          </div>
          <p className="clause reveal">Right in all three, the door opens. Wrong, a torch dies.</p>
        </div>
      </section>

      <section className="band" aria-label="The six floors, one plate each">
        {FLOORS.map((floor) => (
          <figure className="reveal" key={floor.plate}>
            <Plate name={floor.plate} alt={`${floor.plateTitle}, etching by Piranesi`} />
            <figcaption>{floor.name}</figcaption>
          </figure>
        ))}
      </section>

      <section id="floors" className="floors">
        <div className="floors-intro">
          <h2 className="reveal">Six floors down</h2>
          <p className="reveal">
            You carry four torches. A wrong door or a hint burns one, a door opened on the first try lights one again. On each floor you choose one of two
            doors. At the bottom waits a stair that never ends.
          </p>
        </div>
        {FLOORS.map((floor) => (
          <div className="floor" key={floor.name}>
            <div className="floor-head reveal">
              <h3>{floor.name}</h3>
              <span>{floor.rooms.length === 1 ? 'The last door' : `${floor.concept}`}</span>
            </div>
            <ul className="floor-rooms">
              {floor.rooms.map((room, i) => (
                <li className="reveal" key={room.id}>
                  <Plate name={floor.plate} alt={`${floor.plateTitle}, by Piranesi`} className="bullet" position={i === 0 ? '30% 40%' : '70% 60%'} />
                  <div>
                    <p className="room-line">
                      <strong>{room.title}</strong>
                      <span>{floor.rooms.length === 1 ? floor.concept : `Door ${i === 0 ? 'left' : 'right'}`}</span>
                    </p>
                    <p className="room-story">{room.story}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer className="footer">
        <div className="footer-mark" aria-hidden="true">
          {[58, 70, 82, 100, 88, 74, 64].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="footer-name">SQL Dungeon</p>
        <div className="footer-cols">
          <div>
            <p className="footer-head">Play</p>
            <button className="text-button" onClick={descend}>New run</button>
            <button className="text-button" onClick={() => onStart(today, true)}>Today's dungeon</button>
          </div>
          <div>
            <p className="footer-head">Project</p>
            <a href={GITHUB}>Source on GitHub</a>
            <a href={`${GITHUB}/blob/main/docs/spike-sandbox.md`}>How the sandbox holds</a>
            <a href="https://pglite.dev">Postgres in the browser: PGlite</a>
          </div>
          <div className="footer-credits">
            <p className="footer-head">The plates</p>
            <p>
              Etchings by Giovanni Battista Piranesi from Le Carceri d'invenzione, second edition, 1761. Public domain (CC0 or public domain mark), scans via Wikimedia Commons:{' '}
              {CREDITS.map(([title, href], i) => (
                <span key={title}>
                  <a href={href}>{title}</a>
                  {i < CREDITS.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
