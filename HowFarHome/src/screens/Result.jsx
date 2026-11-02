import { useEffect, useState } from 'react'
import StatsDashboard from '../components/StatsDashboard.jsx'
import StreetViewWindow from '../components/StreetViewWindow.jsx'

const COUNT_UP_MS = 1400

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountUp(target) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    if (prefersReducedMotion()) return

    let frame
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1)
      const eased = 1 - (1 - progress) ** 4
      setValue(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

function Result({ result, onSearchAnother }) {
  const { municipality, distanceKm, sign } = result
  const shownKm = useCountUp(distanceKm)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl animate-screen-in flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onSearchAnother}
          className="cursor-pointer font-display text-xl font-bold tracking-tight text-signal"
        >
          HowFarHome?
        </button>
        <span className="text-sm text-white/60">Datos de prueba</span>
      </header>

      <section className="mt-10 sm:mt-14">
        <h1 className="text-lg text-pretty text-white sm:text-xl">
          El cartel más lejano que menciona{' '}
          <strong className="font-semibold wrap-break-word">{municipality}</strong> está a
          <span className="sr-only"> {distanceKm} kilómetros</span>
        </h1>
        <p
          aria-hidden="true"
          className="mt-1 font-display text-[clamp(5rem,20vw,12rem)] leading-none font-bold tracking-tight text-signal tabular-nums"
        >
          {shownKm} km
        </p>
        <p className="mt-3 text-lg text-pretty text-white sm:text-xl">
          En la {sign.road}, a la altura de {sign.place} ({sign.province}).
        </p>
      </section>

      <div
        className="mt-10 grid animate-rise-in gap-4 [animation-delay:250ms] lg:grid-cols-[3fr_2fr]"
      >
        <StreetViewWindow result={result} />
        <StatsDashboard result={result} />
      </div>

      <div className="mt-8 flex justify-center pb-2">
        <button
          type="button"
          onClick={onSearchAnother}
          className="h-12 w-full cursor-pointer rounded-lg bg-signal px-6 font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98] sm:w-auto"
        >
          Buscar otra localidad
        </button>
      </div>
    </main>
  )
}

export default Result
