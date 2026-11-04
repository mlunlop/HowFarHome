import { lazy, Suspense, useState } from 'react'
import Road from '../components/Road.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { osmEditUrl, submitReport } from '../services/reports.js'

//El editor lleva el mapa (Leaflet): solo se descarga al abrirlo
const SignEditor = lazy(() => import('../components/SignEditor.jsx'))

//Ningún cartel conocido menciona el municipio: en vez de un error, se invita a añadir el primero
function NoSigns({ result, onAdded, onSearchAnother }) {
  const { municipality, region, home, municipalityKey } = result
  const [editing, setEditing] = useState(false)

  async function handleSave(point, note) {
    const report = await submitReport(municipalityKey, { kind: 'add', ...point, note })
    setEditing(false)
    onAdded(report)
  }

  return (
    <main className="flex min-h-dvh animate-screen-in flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 pt-6 sm:pt-8">
        <header>
          <button
            type="button"
            onClick={onSearchAnother}
            className="cursor-pointer font-display text-2xl font-bold tracking-tight text-signal sm:text-3xl"
          >
            HowFarHome?
          </button>
        </header>

        <section className="mt-12" aria-labelledby="no-signs-title">
          <p className="text-white/70">Todavía no conocemos ningún cartel de</p>
          <h1
            id="no-signs-title"
            className="mt-1 font-display text-[clamp(2.25rem,7vw,4rem)] leading-[1.05] font-bold tracking-tight wrap-break-word text-signal"
          >
            {municipality}
          </h1>
          {region && region !== municipality && <p className="mt-1 text-white/60">{region}</p>}

          <p className="mt-6 text-lg leading-relaxed text-pretty text-white">
            Solo aparecen los carteles que alguien ha mapeado en OpenStreetMap o fotografiado. ¿Sabes
            dónde hay uno que diga «{municipality}»? Añádelo y será el primero.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-12 cursor-pointer rounded-lg bg-signal px-6 font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98]"
            >
              Añadir un cartel de {municipality}
            </button>
            <button
              type="button"
              onClick={onSearchAnother}
              className="h-12 cursor-pointer rounded-lg border border-white/25 px-6 font-semibold text-white transition-colors hover:border-white"
            >
              Buscar otra localidad
            </button>
          </div>

          <p className="mt-4 text-sm text-white/60">
            Si te animas, mapéalo también en{' '}
            <a
              href={osmEditUrl(home)}
              target="_blank"
              rel="noopener"
              className="underline decoration-signal underline-offset-4 transition-colors hover:text-white"
            >
              OpenStreetMap
            </a>{' '}
            y lo aprovechará todo el mundo.
          </p>
        </section>
      </div>

      <Road className="mt-10 min-h-40 flex-1" slow />
      <SiteFooter className="px-4 pb-8" />

      {editing && (
        <Suspense fallback={null}>
          <SignEditor
            mode="add"
            municipality={municipality}
            start={home}
            origin={null}
            onSave={handleSave}
            onClose={() => setEditing(false)}
          />
        </Suspense>
      )}
    </main>
  )
}

export default NoSigns
