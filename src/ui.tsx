import { useEffect, type ReactNode } from 'react'
import { MAX_TORCHES, type Run } from './game/run'

export const GITHUB = 'https://github.com/tojacob03/sql-dungeon'

// A Piranesi plate inside the arch, printed light on teal.
export function Plate({ name, alt, className = '', position, eager }: { name: string; alt: string; className?: string; position?: string; eager?: boolean }) {
  return (
    <figure className={`plate ${className}`}>
      <img src={`${import.meta.env.BASE_URL}plates/${name}.jpg`} alt={alt} loading={eager ? 'eager' : 'lazy'} style={{ objectPosition: position }} />
    </figure>
  )
}

export function Torches({ count }: { count: number }) {
  return (
    <span className="torches" role="img" aria-label={`${count} of ${MAX_TORCHES} torches left`}>
      {Array.from({ length: MAX_TORCHES }, (_, i) => (
        <span key={i} className={i < count ? 'pip lit' : 'pip'} />
      ))}
    </span>
  )
}

export const runLabel = (run: Run) => (run.daily ? `Daily dungeon, ${dateLabel(run.seed)}` : `Run ${run.seed}`)

export const dateLabel = (daily: number) =>
  new Date(Math.floor(daily / 10000), Math.floor(daily / 100) % 100 - 1, daily % 100).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

export function GameBar({ run, onTitle, children }: { run: Run; onTitle: () => void; children?: ReactNode }) {
  return (
    <header className="gamebar">
      <button className="wordmark" onClick={onTitle}>
        SQL Dungeon
      </button>
      <span className="gamebar-run">{runLabel(run)}</span>
      {children}
      <span className="gamebar-score">{run.score} points</span>
      <Torches count={run.torches} />
    </header>
  )
}

// Adds .is-in to every .reveal element once it scrolls into view.
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-in)')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
