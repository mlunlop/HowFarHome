import { formatKm } from '../services/geo.js'

const COMPASS = [
  'Norte', 'Nornoreste', 'Noreste', 'Estenoreste',
  'Este', 'Estesureste', 'Sureste', 'Sursureste',
  'Sur', 'Sursuroeste', 'Suroeste', 'Oestesuroeste',
  'Oeste', 'Oestenoroeste', 'Noroeste', 'Nornoroeste',
]

function compassName(degrees) {
  return COMPASS[Math.round(degrees / 22.5) % COMPASS.length]
}

function formatDrive(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`
}

function formatWalk(totalHours) {
  if (totalHours < 1) return `${Math.round(totalHours * 60)} min`
  const rounded = Math.round(totalHours)
  const days = Math.floor(rounded / 24)
  const hours = rounded % 24
  return days ? `${days} d ${hours} h` : `${hours} h`
}

function Stat({ label, value, note, icon }) {
  return (
    <div className="flex flex-col bg-ground p-4 sm:p-5">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
        {icon}
        {value}
      </dd>
      <dd className="mt-1 text-sm text-white/60">{note}</dd>
    </div>
  )
}

//stats.route es undefined mientras se calcula y null si OSRM no encontró ruta
function StatsDashboard({ stats }) {
  const { distanceKm, nearestKm, route, signsFound, bearingDegrees } = stats
  const pending = route === undefined
  const walkHours = (route?.distanceKm ?? distanceKm) / 5
  const routeValue = (format) => (pending ? '…' : route ? format(route) : '—')

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/15 bg-ground" aria-labelledby="stats-title">
      <h2 id="stats-title" className="border-b border-white/15 px-4 py-3 font-display text-lg font-semibold text-signal">
        El viaje de vuelta
      </h2>
      <dl className="grid flex-1 grid-cols-2 gap-px bg-white/15">
        <Stat
          label="Por carretera"
          value={routeValue((r) => `${formatKm(r.distanceKm)} km`)}
          note={`${formatKm(distanceKm)} km en línea recta`}
        />
        <Stat
          label="Al volante"
          value={routeValue((r) => formatDrive(r.durationMinutes))}
          note="Según OSRM"
        />
        <Stat
          label="Andando sin parar"
          value={pending ? '…' : formatWalk(walkHours)}
          note="A 5 km/h, sin dormir"
        />
        <Stat
          label="Carteles encontrados"
          value={signsFound}
          note="Mapeados en OSM"
        />
        <Stat
          label="Rumbo a casa"
          value={`${bearingDegrees}°`}
          note={compassName(bearingDegrees)}
          icon={
            <svg
              viewBox="0 0 24 24"
              className="size-6 shrink-0 text-signal"
              fill="currentColor"
              style={{ transform: `rotate(${bearingDegrees}deg)` }}
              aria-hidden="true"
            >
              <path d="M12 2 20 21l-8-4-8 4z" />
            </svg>
          }
        />
        <Stat
          label="El más cercano"
          value={`${formatKm(nearestKm)} km`}
          note="Del centro del municipio"
        />
      </dl>
    </section>
  )
}

export default StatsDashboard
