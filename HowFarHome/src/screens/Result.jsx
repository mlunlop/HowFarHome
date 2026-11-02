import { useEffect, useState } from 'react'
import CandidateList from '../components/CandidateList.jsx'
import StatsDashboard from '../components/StatsDashboard.jsx'
import StreetViewWindow from '../components/StreetViewWindow.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import { usePhotoChecks, useSignDetails } from '../hooks/useSignDetails.js'
import { bearingDegrees, formatKm } from '../services/geo.js'
import { castVote, myVote, verdict } from '../services/votes.js'

const COUNT_UP_MS = 1400

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useCountUp(target) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    if (prefersReducedMotion()) return

    let frame
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1)
      const eased = 1 - (1 - progress) ** 4
      setValue(eased * target)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

function verdictsFor(candidates, votes) {
  return Object.fromEntries(candidates.map((sign) => [sign.key, verdict(votes[sign.key])]))
}

function Result({ result, onSearchAnother }) {
  const { municipality, region, home, municipalityKey, candidates, signsFound, nearestKm } = result
  const [votes, setVotes] = useState(result.votes)
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState(null)
  const verdicts = verdictsFor(candidates, votes)
  const alive = candidates.filter((sign) => verdicts[sign.key] !== 'rejected')
  const [selectedKey, setSelectedKey] = useState((alive[0] ?? candidates[0]).key)

  const sign = candidates.find((candidate) => candidate.key === selectedKey)
  const details = useSignDetails(sign, home)
  const checks = usePhotoChecks(candidates, municipality)
  const shownKm = useCountUp(sign.distanceKm)
  const isFarthest = sign.key === alive[0]?.key

  const location = details?.location
  const signPlace = location?.place && `${location.place}${location.region ? ` (${location.region})` : ''}`

  async function handleVote(value) {
    setVoting(true)
    setVoteError(null)
    try {
      await castVote(municipalityKey, sign.key, value)
      const tally = { ...(votes[sign.key] ?? { yes: 0, no: 0 }) }
      tally[value > 0 ? 'yes' : 'no']++
      const updated = { ...votes, [sign.key]: tally }
      setVotes(updated)

      // Si lo descartan, pasamos al siguiente candidato que siga en pie.
      if (verdict(tally) === 'rejected') {
        const next = candidates.find((c) => c.key !== sign.key && verdict(updated[c.key]) !== 'rejected')
        if (next) setSelectedKey(next.key)
      }
    } catch {
      setVoteError('No se pudo guardar el voto. Inténtalo de nuevo.')
    } finally {
      setVoting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl animate-screen-in flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onSearchAnother}
          className="cursor-pointer font-display text-xl font-bold tracking-tight text-signal"
        >
          HowFarHome?
        </button>
      </header>

      <section className="mt-10 sm:mt-14">
        <h1 className="text-lg text-pretty text-white sm:text-xl">
          {isFarthest ? 'El cartel más lejano que menciona' : 'Este candidato a cartel de'}{' '}
          <strong className="font-semibold wrap-break-word">
            {municipality}
            {region && region !== municipality && ` (${region})`}
          </strong>{' '}
          está a
          <span className="sr-only"> {formatKm(sign.distanceKm)} kilómetros</span>
        </h1>
        <p
          aria-hidden="true"
          className="mt-1 font-display text-[clamp(5rem,20vw,12rem)] leading-none font-bold tracking-tight text-signal tabular-nums"
        >
          {formatKm(shownKm)} km
        </p>
        {(sign.road || signPlace) && (
          <p className="mt-3 text-lg text-pretty text-white sm:text-xl">
            {sign.road && `En la ${sign.road}`}
            {sign.road && signPlace && ', a la altura de '}
            {!sign.road && signPlace && 'A la altura de '}
            {signPlace}.
          </p>
        )}
        {!alive.length && (
          <p className="mt-3 text-white/60">
            Todos los candidatos han sido descartados por otras personas.
          </p>
        )}
      </section>

      <div className="mt-10 grid animate-rise-in gap-4 [animation-delay:250ms] lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <StreetViewWindow municipality={municipality} sign={sign} panorama={details?.panorama} />
          <VerificationPanel
            municipality={municipality}
            tally={votes[sign.key]}
            myVote={myVote(municipalityKey, sign.key)}
            onVote={handleVote}
            voting={voting}
            check={checks[sign.key]}
          />
          {voteError && (
            <p role="alert" className="text-sm text-signal">
              {voteError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <StatsDashboard
            stats={{
              distanceKm: sign.distanceKm,
              nearestKm,
              signsFound,
              route: details ? details.route : undefined,
              bearingDegrees: bearingDegrees(sign, home),
            }}
          />
          <CandidateList
            candidates={candidates}
            selectedKey={selectedKey}
            verdicts={verdicts}
            checks={checks}
            onSelect={setSelectedKey}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-center pb-2">
        <button
          type="button"
          onClick={onSearchAnother}
          className="h-12 w-full cursor-pointer rounded-lg bg-signal px-6 font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98] sm:w-auto"
        >
          Buscar otra localidad
        </button>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        Datos ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
          colaboradores de OpenStreetMap
        </a>
        {' '}y{' '}
        <a href="https://www.mapillary.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
          Mapillary
        </a>
        . Solo aparecen los carteles que alguien ha mapeado.
      </footer>
    </main>
  )
}

export default Result
