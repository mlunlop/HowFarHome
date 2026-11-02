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
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return days ? `${days} d ${hours} h` : `${hours} h`
}

function Stat({ label, value, note, icon }) {
  return (
    <div className="flex flex-col bg-black p-4 sm:p-5">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
        {icon}
        {value}
      </dd>
      <dd className="mt-1 text-sm text-white/60">{note}</dd>
    </div>
  )
}

function StatsDashboard({ result }) {
  const {
    distanceKm,
    roadDistanceKm,
    driveMinutes,
    walkHours,
    signsFound,
    fartherThanPercent,
    bearingDegrees,
  } = result

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-white/15" aria-labelledby="stats-title">
      <h2 id="stats-title" className="border-b border-white/15 px-4 py-3 font-display text-lg font-semibold text-signal">
        El viaje de vuelta
      </h2>
      <dl className="grid flex-1 grid-cols-2 gap-px bg-white/15">
        <Stat
          label="Por carretera"
          value={`${roadDistanceKm} km`}
          note={`${distanceKm} km en línea recta`}
        />
        <Stat
          label="Al volante"
          value={formatDrive(driveMinutes)}
          note="A 95 km/h de media"
        />
        <Stat
          label="Andando sin parar"
          value={formatWalk(walkHours)}
          note="A 5 km/h, sin dormir"
        />
        <Stat
          label="Carteles encontrados"
          value={signsFound}
          note="Con este nombre"
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
          label="Más lejos que"
          value={`${fartherThanPercent} %`}
          note="De los municipios"
        />
      </dl>
    </section>
  )
}

export default StatsDashboard
