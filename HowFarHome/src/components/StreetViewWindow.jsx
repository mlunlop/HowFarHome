import { formatKm } from '../services/geo.js'
import { embedUrl, mapsUrl } from '../services/streetView.js'

const NAME_MAX_WIDTH = 288
const NAME_MAX_FONT_SIZE = 38

// Escena dibujada que sustituye a la foto cuando no hay clave de Google o cobertura.
function DrawnScene({ result }) {
  const { municipality, distanceKm, sign } = result
  const nameFontSize = Math.min(
    NAME_MAX_FONT_SIZE,
    NAME_MAX_WIDTH / (municipality.length * 0.56),
  )

  return (
    <svg
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      role="img"
      aria-label={`Dibujo orientativo del cartel de ${municipality}`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0a0a" />
          <stop offset="1" stopColor="#333" />
        </linearGradient>
      </defs>

      <rect width="800" height="200" fill="url(#sky)" />
      <path d="M0 190 90 150l90 28 110-42 120 46 130-52 110 40 150-30v60H0z" fill="#161616" />
      <rect y="190" width="800" height="260" fill="#0c0c0c" />

      <path d="M280 190 40 450h480z" fill="#1d1d1d" />
      <path d="m280 190-222 260M280 190l222 260" stroke="#fff" strokeOpacity=".55" strokeWidth="2" fill="none" />
      <path d="M280 206v14M279 240v24M278 292v38M276 368v60" stroke="#fff" strokeWidth="4" fill="none" />

      <path d="M484 200v120M716 200v120" stroke="#777" strokeWidth="8" />
      <rect x="440" y="84" width="320" height="130" rx="8" fill="#fff" />
      <rect x="447" y="91" width="306" height="116" rx="4" fill="none" stroke="#000" strokeWidth="2" />

      {sign.badge && (
        <>
          <rect x="458" y="102" width="92" height="28" rx="4" fill="#ff2d2d" />
          <text x="504" y="122" textAnchor="middle" fill="#fff" fontFamily="Inter Variable, sans-serif" fontSize="16" fontWeight="700">
            {sign.badge.split(';')[0]}
          </text>
        </>
      )}
      <text x="742" y="123" textAnchor="end" fill="#000" fontFamily="Inter Variable, sans-serif" fontSize="20" fontWeight="600">
        {formatKm(distanceKm)} km
      </text>
      <text x="456" y="178" fill="#000" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize={nameFontSize} fontWeight="700">
        {municipality}
      </text>
    </svg>
  )
}

function StreetViewWindow({ result }) {
  const { municipality, sign, panorama } = result

  return (
    <section className="overflow-hidden rounded-xl border border-white/15 bg-ground" aria-labelledby="street-view-title">
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
        <h2 id="street-view-title" className="font-display text-lg font-semibold text-signal">
          Street View
        </h2>
        <span className="text-sm text-white/60">
          {panorama ? panorama.date && `Foto de ${panorama.date}` : 'Dibujo orientativo'}
        </span>
      </header>

      <div className="relative aspect-video bg-neutral-950">
        {panorama ? (
          <iframe
            title={`Street View del cartel de ${municipality}`}
            src={embedUrl(panorama)}
            className="absolute inset-0 size-full"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <DrawnScene result={result} />
        )}
      </div>

      <footer className="space-y-2 border-t border-white/15 px-4 py-3 text-sm">
        <p className="wrap-break-word text-white">
          <span className="text-white/60">Según OpenStreetMap, indica: </span>
          {sign.text}
        </p>
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
