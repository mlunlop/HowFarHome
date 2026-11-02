import { useEffect, useState } from 'react'
import { isPostcode, suggestPlaces } from '../services/places.js'

const EXAMPLE = 'Peal de Becerro'
const MIN_SUGGEST_LENGTH = 3
const SUGGEST_DELAY_MS = 250

function placeLine(place) {
  return [place.detail, place.region].filter(Boolean).join(', ')
}

function Landing({ initialQuery, error, onSearch }) {
  const [value, setValue] = useState(initialQuery)
  const [suggested, setSuggested] = useState({ text: '', items: [] })
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const name = value.trim()

  useEffect(() => {
    if (name.length < MIN_SUGGEST_LENGTH || isPostcode(name)) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      suggestPlaces(name, { signal: controller.signal })
        .then((items) => setSuggested({ text: name, items }))
        .catch(() => {})
    }, SUGGEST_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [name])

  // Solo se enseñan las sugerencias del texto actual, nunca las de una búsqueda anterior.
  const suggestions = suggested.text === name ? suggested.items : []
  const showSuggestions = open && suggestions.length > 0

  function pick(suggestion) {
    setOpen(false)
    onSearch(suggestion)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (showSuggestions && activeIndex >= 0) pick(suggestions[activeIndex])
    else if (name) onSearch(name)
  }

  function handleKeyDown(event) {
    if (!showSuggestions) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      // -1 es «ninguna»: se vuelve al texto escrito al salir por arriba o por abajo.
      setActiveIndex((index) => {
        const next = index + step
        if (next >= suggestions.length) return -1
        if (next < -1) return suggestions.length - 1
        return next
      })
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh animate-screen-in flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <h1 className="font-display text-[clamp(3rem,12vw,8rem)] leading-none font-bold tracking-tight text-signal">
        HowFarHome?
      </h1>

      <div className="relative mt-10 w-full max-w-xl sm:mt-12">
        <form
          onSubmit={handleSubmit}
          className="flex items-center rounded-xl border border-white/25 bg-ground p-1.5 transition-colors focus-within:border-signal"
        >
          <label htmlFor="municipality" className="sr-only">
            Municipio o código postal
          </label>
          <input
            id="municipality"
            type="text"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="place-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={showSuggestions && activeIndex >= 0 ? `place-${activeIndex}` : undefined}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setActiveIndex(-1)
              setOpen(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder="Municipio o código postal"
            maxLength={80}
            autoComplete="off"
            autoFocus
            className="h-12 min-w-0 flex-1 bg-transparent pr-2 pl-3.5 text-lg text-white outline-none placeholder:text-white/50"
          />
          <button
            type="submit"
            disabled={!name}
            aria-label="Buscar"
            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-lg bg-signal text-black transition-[background-color,color,transform] hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        {showSuggestions && (
          <ul
            id="place-suggestions"
            role="listbox"
            aria-label="Sugerencias"
            className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-white/15 bg-ground text-left shadow-2xl shadow-black/60"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`place-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown en vez de click: el blur del input cerraría la lista antes.
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(suggestion)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-3 ${
                  index === activeIndex ? 'bg-white/10' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="text-white">{suggestion.name}</span>
                  <span className="ml-2 text-sm text-white/60">{placeLine(suggestion)}</span>
                </span>
                <span className="shrink-0 text-xs text-white/60">{suggestion.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-signal">
          {error}
        </p>
      )}

      <p className="mt-8 max-w-lg text-base leading-relaxed text-pretty text-white sm:text-lg">
        Escribe tu municipio o tu código postal y buscamos en OpenStreetMap el cartel de carretera
        más lejano que lo menciona: a cuántos kilómetros está de casa y cómo se ve en Street View.
      </p>

      <button
        type="button"
        onClick={() => onSearch(EXAMPLE)}
        className="mt-4 cursor-pointer text-sm text-white/60 underline decoration-signal underline-offset-4 transition-colors hover:text-white"
      >
        Prueba con {EXAMPLE}
      </button>

      <div
        aria-hidden="true"
        className="dashed-line absolute bottom-0 left-1/2 hidden h-[12vh] w-1 -translate-x-1/2 mask-t-from-20% [@media(min-height:720px)]:block"
      />
    </main>
  )
}

export default Landing
