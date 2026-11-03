import Road from '../components/Road.jsx'
import { SEARCH_STEPS } from '../services/searchFarthestSign.js'

function StepMarker({ state }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="size-4 text-signal" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 8.5 3.25 3.25L13 5" />
      </svg>
    )
  }
  if (state === 'active') {
    return <span className="size-2 animate-pulse-dot rounded-full bg-signal" />
  }
  return <span className="size-1.5 rounded-full bg-white/25" />
}

function Loading({ query, step, onCancel }) {
  const progress = (step / SEARCH_STEPS.length) * 100

  return (
    <main className="flex min-h-dvh animate-screen-in flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 pt-[max(3rem,10vh)]">
        <p className="text-white/70">Buscando el cartel más lejano de</p>
        <h1 className="mt-1 font-display text-[clamp(2.25rem,7vw,4rem)] leading-[1.05] font-bold tracking-tight wrap-break-word text-signal">
          {query}
        </h1>

        <div
          role="progressbar"
          aria-label="Progreso de la búsqueda"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="mt-8 h-0.5 bg-white/15"
        >
          <div
            className="h-full bg-signal transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-6 space-y-3">
          {SEARCH_STEPS.map((label, index) => {
            const state = index < step ? 'done' : index === step ? 'active' : 'pending'
            return (
              <li
                key={label}
                aria-current={state === 'active' ? 'step' : undefined}
                className={`flex items-center gap-3 transition-colors duration-300 ${
                  state === 'pending' ? 'text-white/40' : 'text-white'
                }`}
              >
                <span className="grid size-4 shrink-0 place-items-center">
                  <StepMarker state={state} />
                </span>
                {label}
              </li>
            )
          })}
        </ol>

        <button
          type="button"
          onClick={onCancel}
          className="mt-6 cursor-pointer self-start text-sm text-white/60 underline decoration-signal underline-offset-4 transition-colors hover:text-white"
        >
          Cancelar
        </button>
      </div>

      <Road className="min-h-40 flex-1" />
    </main>
  )
}

export default Loading
