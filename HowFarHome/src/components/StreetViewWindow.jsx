import { allow, useConsent } from '../services/consent.js'
import { osmEditUrl } from '../services/reports.js'
import { embedUrl, freeEmbedUrl, mapsUrl } from '../services/streetView.js'

const SOURCE_PREFIX = {
  destination: 'Según OpenStreetMap, indica: ',
  'road-name': 'Deducido de la carretera: ',
  user: 'Añadido por un usuario: ',
  photo: 'Leído por OCR en una foto: ',
}

function StreetViewWindow({ municipality, sign, panorama }) {
  const consent = useConsent()

  return (
    <section className="overflow-hidden rounded-xl border border-white/15 bg-ground" aria-labelledby="street-view-title">
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
        <h2 id="street-view-title" className="font-display text-lg font-semibold text-signal">
          Street View
        </h2>
        {panorama?.date && <span className="text-sm text-white/60">Foto de {panorama.date}</span>}
      </header>

      <div className="relative aspect-video bg-neutral-950">
        {consent?.external ? (
          <iframe
            key={sign.key}
            title={`Street View del cartel de ${municipality}`}
            src={panorama ? embedUrl(panorama) : freeEmbedUrl(sign)}
            className="absolute inset-0 size-full"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          // Google instala cookies al mostrar Street View: no se carga sin permiso.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="max-w-sm text-sm text-pretty text-white/70">
              Street View lo sirve Google, que instala sus propias cookies. Cárgalo para ver la foto del cartel.
            </p>
            <button
              type="button"
              onClick={() => allow('external')}
              className="h-11 cursor-pointer rounded-lg bg-signal px-5 text-sm font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98]"
            >
              Cargar Street View
            </button>
            <a href="/cookies/" className="text-xs text-white/60 underline decoration-signal underline-offset-4 hover:text-white">
              Política de cookies
            </a>
          </div>
        )}
      </div>

      <footer className="space-y-2 border-t border-white/15 px-4 py-3 text-sm">
        <p className="wrap-break-word text-white">
          <span className="text-white/60">{SOURCE_PREFIX[sign.source]}</span>
          {sign.text}
        </p>
        {sign.corrections > 0 && (
          <p className="text-white/60">
            Posición corregida por {sign.corrections === 1 ? 'una persona' : `${sign.corrections} personas`}.
          </p>
        )}
        {!panorama && (
          <p className="text-white/60">Si no aparece imagen, Google no tiene fotos de este punto.</p>
        )}
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-white/60 tabular-nums">
          <span>
            {sign.lat.toFixed(5)}, {sign.lng.toFixed(5)}
          </span>
          <span className="flex gap-4">
            {sign.osmUrl && (
              <a href={sign.osmUrl} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-4 transition-colors hover:text-white">
                Ver en OSM
              </a>
            )}
            {sign.imageId && (
              <a href={`https://www.mapillary.com/app/?pKey=${sign.imageId}`} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-4 transition-colors hover:text-white">
                Foto en Mapillary
              </a>
            )}
            <a href={osmEditUrl(sign)} target="_blank" rel="noreferrer" className="underline decoration-signal underline-offset-4 transition-colors hover:text-white">
              Mejorar en OSM
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
