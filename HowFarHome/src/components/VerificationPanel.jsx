import { photoCheckAvailable } from '../services/photoCheck.js'
import { votesAreShared } from '../services/votes.js'

const PHOTO_MESSAGES = {
  checking: 'Buscando el cartel en fotos de Mapillary…',
  'no-match': 'Hay fotos de Mapillary aquí, pero no hemos podido leer el nombre en ellas.',
  'no-photos': 'Mapillary no tiene fotos de este punto.',
  error: 'No se pudo completar la lectura de fotos de Mapillary.',
}

function PhotoCheck({ check, municipality }) {
  if (!photoCheckAvailable || !check) return null

  if (check.status === 'match') {
    return (
      <div className="flex gap-3 border-t border-white/15 pt-4">
        <img
          src={check.crop}
          alt={`Recorte del cartel donde se lee ${municipality}`}
          className="h-16 w-28 shrink-0 rounded object-cover"
        />
        <p className="text-sm text-white">
          <span className="font-semibold text-signal">Leído en una foto. </span>
          El OCR encontró «{municipality}» en un cartel fotografiado aquí.{' '}
          <a
            href={`https://www.mapillary.com/app/?pKey=${check.imageId}`}
            target="_blank"
            rel="noreferrer"
            className="text-white/60 underline decoration-signal underline-offset-4 hover:text-white"
          >
            Ver foto en Mapillary
          </a>
        </p>
      </div>
    )
  }

  return <p className="border-t border-white/15 pt-4 text-sm text-white/60">{PHOTO_MESSAGES[check.status]}</p>
}

function VerificationPanel({ municipality, tally, myVote, onVote, voting, check, onMove }) {
  const yes = tally?.yes ?? 0
  const no = tally?.no ?? 0

  return (
    <section className="space-y-4 rounded-xl border border-white/15 bg-ground p-4 sm:p-5" aria-labelledby="verify-title">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h2 id="verify-title" className="font-display text-lg font-semibold text-signal">
          ¿Ves un cartel que diga «{municipality}»?
        </h2>
        <p className="text-sm text-white/60 tabular-nums">
          {yes} sí · {no} no{!votesAreShared && ' (solo en este navegador)'}
        </p>
      </div>

      {myVote ? (
        <p className="text-sm text-white">
          Gracias, has votado que {myVote > 0 ? 'sí hay cartel' : 'no hay cartel'}.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onVote(1)}
            disabled={voting}
            className="h-11 flex-1 cursor-pointer rounded-lg bg-signal px-5 font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            Sí, lo veo
          </button>
          <button
            type="button"
            onClick={() => onVote(-1)}
            disabled={voting}
            className="h-11 flex-1 cursor-pointer rounded-lg border border-white/25 px-5 font-semibold text-white transition-[border-color,transform] hover:border-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            No hay cartel
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onMove}
        className="cursor-pointer text-sm text-white/60 underline decoration-signal underline-offset-4 transition-colors hover:text-white"
      >
        ¿Está un poco más allá? Corregir la posición
      </button>

      <PhotoCheck check={check} municipality={municipality} />
    </section>
  )
}

export default VerificationPanel
