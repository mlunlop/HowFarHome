import { useEffect, useState } from 'react'

// Resultados reales de la búsqueda (3 nov 2026). Pueden variar con los datos y los votos:
// por eso se muestran como aproximados y al pulsar se lanza la búsqueda de verdad.
// Llevan las coordenadas del municipio para no pasar por «¿Cuál es el tuyo?» (capital o provincia).
const EXAMPLES = [
  { km: 509, name: 'Madrid', region: 'Comunidad de Madrid', lat: 40.416782, lng: -3.703507 },
  { km: 349, name: 'Sevilla', region: 'Sevilla', lat: 37.3886303, lng: -5.9953403 },
  { km: 330, name: 'Badajoz', region: 'Badajoz', lat: 38.878187, lng: -6.9701115 },
  { km: 303, name: 'Valencia', region: 'Valencia', lat: 39.4697065, lng: -0.3763353 },
  { km: 268, name: 'Zaragoza', region: 'Zaragoza', lat: 41.6915847, lng: -0.9101268 },
  { km: 211, name: 'Albacete', region: 'Albacete', lat: 38.9950921, lng: -1.8559154 },
  { km: 194, name: 'Soria', region: 'Soria', lat: 41.7633842, lng: -2.4642041 },
  { km: 162, name: 'Teruel', region: 'Teruel', lat: 40.3436719, lng: -1.1081939 },
].map(({ km, ...place }) => ({ km, place: { detail: null, kind: 'Municipio', population: null, ...place } }))

const ROTATE_MS = 3500

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SignShowcase({ onPick }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const example = EXAMPLES[index]

  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % EXAMPLES.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <figure
      className="flex flex-col items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button
        type="button"
        onClick={() => onPick(example.place)}
        aria-label={`Ver el cartel más lejano de ${example.place.name}, a unos ${example.km} kilómetros`}
        className="group relative z-10 cursor-pointer [perspective:600px]"
      >
        <span
          key={example.place.name}
          className="sign-plate flex w-[min(78vw,320px)] animate-sign-in flex-col items-start bg-signal py-4 pr-16 pl-6 text-left text-ground transition-transform duration-300 group-hover:-translate-y-1 sm:w-[360px] sm:py-5 sm:pl-7"
        >
          <span className="max-w-full truncate font-display text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            {example.place.name}
          </span>
          <span className="font-display text-5xl leading-none font-bold tracking-tight tabular-nums sm:text-6xl">
            {example.km} km
          </span>
        </span>
      </button>

      {/* Postes del cartel */}
      <div aria-hidden="true" className="flex w-[min(60vw,240px)] justify-between px-8 sm:w-[260px]">
        <span className="h-16 w-1.5 rounded-b-sm bg-gradient-to-b from-white/50 to-white/10 sm:h-24" />
        <span className="h-16 w-1.5 rounded-b-sm bg-gradient-to-b from-white/50 to-white/10 sm:h-24" />
      </div>

      <figcaption className="mt-3 max-w-xs text-sm text-pretty text-white/60">
        El cartel más lejano que menciona {example.place.name}, aprox. Púlsalo para verlo.
      </figcaption>

      <div className="mt-3 flex gap-1.5" role="group" aria-label="Ejemplos">
        {EXAMPLES.map((item, itemIndex) => (
          <button
            key={item.place.name}
            type="button"
            onClick={() => setIndex(itemIndex)}
            aria-label={`Ejemplo: ${item.place.name}`}
            aria-current={itemIndex === index}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              itemIndex === index ? 'w-5 bg-signal' : 'w-1.5 bg-white/25 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </figure>
  )
}

export default SignShowcase
