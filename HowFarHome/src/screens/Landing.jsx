import { useEffect, useState } from 'react'
import Road from '../components/Road.jsx'
import SignPhoto from '../components/SignPhoto.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { isPostcode, suggestPlaces } from '../services/places.js'
import { indexMeta } from '../services/signIndex.js'

const MIN_SUGGEST_LENGTH = 3
const SUGGEST_DELAY_MS = 250

// Debe coincidir con el FAQPage de index.html (Google solo lo acepta si el texto está visible).
const FAQ = [
  {
    question: '¿Cómo encuentra HowFarHome? el cartel más lejano de mi pueblo?',
    answer:
      'Busca en OpenStreetMap las señales de dirección cuyo destino menciona tu municipio y en fotos de Mapillary leídas con OCR, calcula la distancia hasta tu pueblo y te muestra el más lejano con su imagen de Street View.',
  },
  {
    question: '¿Por qué no aparece el cartel que yo conozco?',
    answer:
      'Solo aparecen los carteles que alguien ha mapeado en OpenStreetMap o fotografiado en Mapillary. Puedes añadirlo desde la propia web o mapearlo en OpenStreetMap.',
  },
  {
    question: '¿Es gratis?',
    answer: 'Sí. No hace falta registrarse y funciona con cualquier municipio o código postal de España.',
  },
  {
    question: '¿Puedo votar si un cartel existe de verdad?',
    answer:
      'Sí. Cada candidato tiene un voto de sí o no y puedes corregir su posición en el mapa; los votos ayudan a decidir cuál es el cartel principal.',
  },
]

function placeLine(place) {
  return [place.detail, place.region].filter(Boolean).join(', ')
}

// Cifras del índice propio; si no hay índice, la línea no se muestra.
function IndexStats() {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    indexMeta().then((meta) => setCounts(meta?.counts ?? null))
  }, [])

  if (!counts) return null
  const signs = (counts['nodos con destino'] ?? 0) + (counts['vías con destino'] ?? 0)
  const places = counts['núcleos de población'] ?? 0
  const format = (value) => value.toLocaleString('es-ES')

  // La fuente va en su propia línea: así ningún separador se queda colgando al partir la línea.
  return (
    <div className="mt-6 text-sm text-white/60">
      <p className="flex flex-wrap gap-x-3 gap-y-1 max-lg:justify-center">
        <span>
          <strong className="font-semibold text-white tabular-nums">{format(signs)}</strong> carteles mapeados
        </span>
        <span aria-hidden="true" className="max-sm:hidden">·</span>
        <span>
          <strong className="font-semibold text-white tabular-nums">{format(places)}</strong> pueblos y ciudades
        </span>
      </p>
      <p className="mt-1">Datos abiertos de OpenStreetMap</p>
    </div>
  )
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
    <>
      <main className="animate-screen-in">
        <section className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
          <header>
            <span className="font-display text-xl font-bold tracking-tight text-signal">HowFarHome?</span>
          </header>

          <div className="grid flex-1 items-center gap-10 py-8 sm:py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="flex flex-col max-lg:items-center max-lg:text-center">
              <p className="text-sm font-semibold tracking-widest text-signal uppercase">
                Cada pueblo tiene un último cartel
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.02] font-bold tracking-tight text-balance text-white">
                ¿Hasta dónde llega el nombre de <span className="text-signal">tu pueblo</span>?
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-pretty text-white/75">
                Escribe tu municipio o código postal y te enseñamos el cartel de carretera más lejano que
                lo menciona: a cuántos kilómetros está de casa y cómo se ve en Street View.
              </p>

              <div className="relative mt-8 w-full max-w-xl">
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

              <IndexStats />
            </div>

            <SignPhoto onPick={onSearch} />
          </div>

          {/* La carretera lleva de la portada a las preguntas frecuentes */}
          <Road slow className="-mx-4 -mb-6 h-36 shrink-0 mask-b-from-60% sm:-mx-6 sm:-mb-8 sm:h-48" />
        </section>

        <section aria-labelledby="faq-title" className="mx-auto w-full max-w-2xl px-4 pt-12 pb-8">
          <h2 id="faq-title" className="text-center font-display text-3xl font-bold tracking-tight text-signal">
            Preguntas frecuentes
          </h2>
          <dl className="mt-8 divide-y divide-white/15 border-y border-white/15">
            {FAQ.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="font-display text-lg font-semibold text-white">{item.question}</dt>
                <dd className="mt-2 leading-relaxed text-pretty text-white/70">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter className="px-4 pb-8" />
    </>
  )
}

export default Landing
