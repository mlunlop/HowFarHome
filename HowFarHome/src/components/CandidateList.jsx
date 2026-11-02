import { formatKm } from '../services/geo.js'

const VERDICT_LABELS = {
  confirmed: 'Confirmado',
  rejected: 'Descartado',
  unverified: 'Sin verificar',
}

const SOURCE_LABELS = {
  destination: 'Etiqueta de destino',
  'road-name': 'Nombre de carretera',
  user: 'Añadido por usuarios',
}

function CandidateList({ candidates, selectedKey, verdicts, checks, onSelect, onAdd }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/15 bg-ground" aria-labelledby="candidates-title">
      <h2 id="candidates-title" className="border-b border-white/15 px-4 py-3 font-display text-lg font-semibold text-signal">
        Candidatos
      </h2>
      <ol className="divide-y divide-white/15">
        {candidates.map((sign) => {
          const verdict = verdicts[sign.key]
          const selected = sign.key === selectedKey
          return (
            <li key={sign.key}>
              <button
                type="button"
                onClick={() => onSelect(sign.key)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  selected ? 'bg-white/5' : ''
                }`}
              >
                <span className={`h-8 w-1 shrink-0 rounded-full ${selected ? 'bg-signal' : 'bg-transparent'}`} />
                <span className={`w-20 shrink-0 font-display text-lg font-semibold tabular-nums ${verdict === 'rejected' ? 'text-white/40 line-through' : 'text-white'}`}>
                  {formatKm(sign.distanceKm)} km
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate text-white">{SOURCE_LABELS[sign.source]}</span>
                  <span className="block text-white/60">
                    {VERDICT_LABELS[verdict]}
                    {checks[sign.key]?.status === 'match' && ' · leído en foto'}
                    {sign.corrections > 0 && ' · posición corregida'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full cursor-pointer items-center gap-2 border-t border-white/15 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/5"
      >
        <span aria-hidden="true" className="text-lg leading-none text-signal">+</span>
        ¿Conoces uno más lejano? Añadir un cartel
      </button>
    </section>
  )
}

export default CandidateList
