import { votesAreShared } from '../services/votes.js'

function VerificationPanel({ municipality, tally, myVote, onVote, voting, onMove }) {
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

    </section>
  )
}

export default VerificationPanel
