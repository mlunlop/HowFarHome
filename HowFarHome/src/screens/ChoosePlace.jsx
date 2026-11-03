import SiteFooter from '../components/SiteFooter.jsx'

function ChoosePlace({ query, places, onPick, onBack }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl animate-screen-in flex-col px-4 py-6 sm:py-8">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer font-display text-xl font-bold tracking-tight text-signal"
        >
          HowFarHome?
        </button>
      </header>

      <section className="mt-12" aria-labelledby="choose-title">
        <p className="text-white/70">Hay varios sitios llamados</p>
        <h1 id="choose-title" className="mt-1 font-display text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] font-bold tracking-tight wrap-break-word text-signal">
          {query}
        </h1>
        <p className="mt-3 text-white">¿Cuál es el tuyo?</p>

        <ul className="mt-6 divide-y divide-white/15 overflow-hidden rounded-xl border border-white/15 bg-ground">
          {places.map((place) => (
            <li key={`${place.lat},${place.lng}`}>
              <button
                type="button"
                onClick={() => onPick(place)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0">
                  <span className="block text-lg text-white">{place.name}</span>
                  <span className="block text-sm text-white/60">
                    {[place.detail, place.region].filter(Boolean).join(', ') || 'España'}
                  </span>
                </span>
                {place.kind && <span className="shrink-0 text-sm text-white/60">{place.kind}</span>}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-white/60">
          ¿No aparece? Prueba con tu código postal o añade la provincia, por ejemplo «{query}, Albacete».
        </p>
      </section>

      <SiteFooter className="mt-auto pt-16" />
    </main>
  )
}

export default ChoosePlace
