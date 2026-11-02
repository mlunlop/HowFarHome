import { embedUrl, freeEmbedUrl, mapsUrl } from '../services/streetView.js'

function StreetViewWindow({ result }) {
  const { municipality, sign, panorama } = result

  return (
    <section className="overflow-hidden rounded-xl border border-white/15 bg-ground" aria-labelledby="street-view-title">
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
        <h2 id="street-view-title" className="font-display text-lg font-semibold text-signal">
          Street View
        </h2>
        {panorama?.date && <span className="text-sm text-white/60">Foto de {panorama.date}</span>}
      </header>

      <div className="relative aspect-video bg-neutral-950">
        <iframe
          title={`Street View del cartel de ${municipality}`}
          src={panorama ? embedUrl(panorama) : freeEmbedUrl(sign)}
          className="absolute inset-0 size-full"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <footer className="space-y-2 border-t border-white/15 px-4 py-3 text-sm">
        <p className="wrap-break-word text-white">
          <span className="text-white/60">Según OpenStreetMap, indica: </span>
          {sign.text}
        </p>
        {!panorama && (
          <p className="text-white/60">Si la vista sale en blanco, Google no tiene fotos de este punto.</p>
        )}
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-white/60 tabular-nums">
          <span>
            {sign.lat.toFixed(5)}, {sign.lng.toFixed(5)}
          </span>
          <span className="flex gap-4">
            <a href={sign.osmUrl} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-4 transition-colors hover:text-white">
              Ver en OSM
            </a>
            <a href={mapsUrl(sign, panorama)} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-4 transition-colors hover:text-white">
              Abrir en Google Maps
            </a>
          </span>
        </div>
      </footer>
    </section>
  )
}

export default StreetViewWindow
