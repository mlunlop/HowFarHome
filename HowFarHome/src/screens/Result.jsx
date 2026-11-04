import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import CandidateList from '../components/CandidateList.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import StatsDashboard from '../components/StatsDashboard.jsx'
import StreetViewWindow from '../components/StreetViewWindow.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import { useSignDetails } from '../hooks/useSignDetails.js'
import { bearingDegrees, formatKm } from '../services/geo.js'
import { applyReports, submitReport } from '../services/reports.js'
import { signKey } from '../services/signs.js'
import { castVote, myVote, verdict } from '../services/votes.js'

//El editor lleva el mapa (Leaflet): solo se descarga al abrirlo
const SignEditor = lazy(() => import('../components/SignEditor.jsx'))

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

//Para ser el resultado principal hace falta confianza: una foto donde se lee el nombre, una
//etiqueta de destino de OSM o votos a favor. Los añadidos por usuarios necesitan confirmación
function canLead(sign, verdicts) {
  const verdict = verdicts[sign.key]
  if (verdict === 'rejected') return false
  if (verdict === 'confirmed') return true
  return sign.source !== 'user' && sign.confidence !== 'baja'
}

//El más lejano que puede liderar; si ninguno puede, el más lejano no descartado
function leaderOf(candidates, verdicts) {
  return (
    candidates.find((sign) => canLead(sign, verdicts)) ??
    candidates.find((sign) => verdicts[sign.key] !== 'rejected') ??
    candidates[0]
  )
}

function Result({ result, notice: initialNotice = null, onSearchAnother }) {
  const { municipality, region, home, municipalityKey, signsFound, nearestKm } = result
  const [votes, setVotes] = useState(result.votes)
  const [reports, setReports] = useState(result.reports)
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState(null)
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState(initialNotice)
  //Memorizado: los hooks de detalles y fotos dependen de que los objetos no cambien en cada render
  const candidates = useMemo(() => applyReports(result.candidates, reports, home), [result.candidates, reports, home])
  const verdicts = verdictsFor(candidates, votes)
  const [selectedKey, setSelectedKey] = useState(
    () => leaderOf(candidates, verdictsFor(candidates, result.votes)).key,
  )

  const sign = candidates.find((candidate) => candidate.key === selectedKey)
  const details = useSignDetails(sign, home)
  const leaders = candidates.filter((candidate) => canLead(candidate, verdicts))
  //Sin confirmar no es lo mismo que descartado: un cartel recién añadido aún no puede liderar
  const allRejected = candidates.every((candidate) => verdicts[candidate.key] === 'rejected')
  const shownKm = useCountUp(sign.distanceKm)
  const isFarthest = sign.key === leaders[0]?.key
  const trusted = canLead(sign, verdicts)

  const location = details?.location
  const signPlace = location?.place && `${location.place}${location.region ? ` (${location.region})` : ''}`

  async function handleVote(value) {
    setVoting(true)
    setVoteError(null)
    try {
      await castVote(municipalityKey, sign.key, value, { source: sign.source, score: sign.score })
      const tally = { ...(votes[sign.key] ?? { yes: 0, no: 0 }) }
      tally[value > 0 ? 'yes' : 'no']++
      const updated = { ...votes, [sign.key]: tally }
      setVotes(updated)

      //Si lo descartan, pasamos al siguiente candidato que siga en pie
      if (verdict(tally) === 'rejected') {
        setSelectedKey(leaderOf(candidates, verdictsFor(candidates, updated)).key)
      }
    } catch {
      setVoteError('No se pudo guardar el voto. Inténtalo de nuevo.')
    } finally {
      setVoting(false)
    }
  }

  async function handleSaveReport(point, note) {
    const report =
      editor === 'add'
        ? await submitReport(municipalityKey, { kind: 'add', ...point, note })
        : await submitReport(municipalityKey, { kind: 'move', signKey: sign.key, ...point })
    setReports((all) => [...all, report])
    if (editor === 'add') setSelectedKey(signKey(report))
    setEditor(null)
    setNotice(
      editor === 'add'
        ? 'Gracias. Tu cartel aparece en la lista y será el principal cuando otras personas lo confirmen.'
        : 'Gracias. La posición del cartel se ha actualizado.',
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl animate-screen-in flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onSearchAnother}
          className="cursor-pointer font-display text-2xl font-bold tracking-tight text-signal sm:text-3xl"
        >
          HowFarHome?
        </button>
      </header>

      <section className="mt-10 sm:mt-14">
        <h1 className="text-lg text-pretty text-white sm:text-xl">
          {!trusted
            ? 'Una pista sin confirmar de un cartel de'
            : isFarthest
              ? 'El cartel más lejano que menciona'
              : 'Este candidato a cartel de'}{' '}
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
        {allRejected && (
          <p className="mt-3 text-white/60">
            Todos los candidatos han sido descartados por otras personas. ¿Conoces un cartel de{' '}
            {municipality}?{' '}
            <button
              type="button"
              onClick={() => setEditor('add')}
              className="cursor-pointer text-white underline decoration-signal underline-offset-4 transition-colors hover:text-signal"
            >
              Añádelo
            </button>
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
            onMove={() => setEditor('move')}
          />
          {notice && (
            <p role="status" className="text-sm text-white">
              {notice}
            </p>
          )}
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
              //Sin carteles de OSM, el más cercano sale de los añadidos por usuarios
              nearestKm: nearestKm ?? candidates.at(-1).distanceKm,
              signsFound,
              route: details ? details.route : undefined,
              bearingDegrees: bearingDegrees(sign, home),
            }}
          />
          <CandidateList
            candidates={candidates}
            selectedKey={selectedKey}
            verdicts={verdicts}
            onSelect={setSelectedKey}
            onAdd={() => setEditor('add')}
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

      {editor && (
        <Suspense fallback={null}>
          <SignEditor
            mode={editor}
            municipality={municipality}
            start={editor === 'move' ? sign : home}
            origin={editor === 'move' ? sign : null}
            onSave={handleSaveReport}
            onClose={() => setEditor(null)}
          />
        </Suspense>
      )}

      <SiteFooter className="mt-6">
        Datos ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-white">
          colaboradores de OpenStreetMap
        </a>
        {' '}y{' '}
        <a href="https://www.mapillary.com" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-white">
          Mapillary
        </a>
        . Solo aparecen los carteles que alguien ha mapeado.
      </SiteFooter>
    </main>
  )
}

export default Result
