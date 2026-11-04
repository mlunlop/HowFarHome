import { useEffect, useRef, useState } from 'react'
import CookieBanner from './components/CookieBanner.jsx'
import ChoosePlace from './screens/ChoosePlace.jsx'
import Landing from './screens/Landing.jsx'
import Loading from './screens/Loading.jsx'
import NoSigns from './screens/NoSigns.jsx'
import Result from './screens/Result.jsx'
import { isPostcode, resolvePlaces } from './services/places.js'
import { applyReports } from './services/reports.js'
import { SearchError, searchFarthestSign } from './services/searchFarthestSign.js'

//Un sitio ya localizado (de la lista de elección) trae coordenadas; el resto hay que buscarlo
const isResolvedPlace = (input) => typeof input === 'object' && input.lat !== undefined

//Cada pantalla es una entrada del historial: «atrás» vuelve a la pantalla anterior de la web
//y no a la página desde la que llegaste (p. ej. Créditos)
const RESTORABLE = new Set(['choose', 'result', 'empty'])

function App() {
  const [screen, setScreen] = useState('landing')
  const [query, setQuery] = useState('')
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const searchRef = useRef(null)
  const dataRef = useRef({})

  useEffect(() => {
    dataRef.current = { result, choices }
  }, [result, choices])

  useEffect(() => {
    function onPopState(event) {
      searchRef.current?.abort()
      const target = event.state?.screen
      const { result, choices } = dataRef.current
      const available = target === 'choose' ? choices.length : result
      setScreen(RESTORABLE.has(target) && available ? target : 'landing')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  //push: pantalla nueva en el historial. replace: sustituye la actual (p. ej. carga → resultado)
  function show(next, mode = 'replace') {
    window.history[mode === 'push' ? 'pushState' : 'replaceState']({ screen: next }, '')
    setScreen(next)
  }

  //Título de la pestaña con el resultado: queda mejor al compartir o guardar en marcadores
  useEffect(() => {
    document.title =
      screen === 'result' && result
        ? `${result.municipality}: su cartel más lejano · HowFarHome?`
        : 'HowFarHome? · El cartel de carretera más lejano de tu pueblo'
  }, [screen, result])

  async function startSearch(input) {
    const label = typeof input === 'string' ? input.trim() : input.name
    const search = new AbortController()
    searchRef.current = search
    setQuery(label)
    setStep(0)
    setError(null)
    show('loading', 'push')

    try {
      let place = isResolvedPlace(input) ? input : null
      if (!place) {
        const places = await resolvePlaces(input, { signal: search.signal })
        if (!places.length) {
          throw new SearchError(
            isPostcode(label)
              ? `No encontramos ningún pueblo con el código postal ${label}.`
              : `No encontramos ningún municipio llamado «${label}» en España.`,
          )
        }
        if (places.length > 1) {
          setChoices(places)
          show('choose')
          return
        }
        place = places[0]
      }

      setQuery(place.name)
      const found = await searchFarthestSign(place, {
        signal: search.signal,
        onProgress: setStep,
      })
      setResult(found)
      setNotice(null)
      //Sin carteles de OSM ni añadidos por nadie se ofrece añadir el primero
      show(applyReports(found.candidates, found.reports, found.home).length ? 'result' : 'empty')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(
        err.userMessage ??
          'Los servidores de mapas no responden ahora mismo. Inténtalo de nuevo en unos minutos.',
      )
      //Se deshace la entrada de la carga: el popstate lleva a la portada
      window.history.back()
    }
  }

  //El cartel recién añadido entra como una aportación más y se enseña el resultado con él
  function signAdded(report) {
    setResult((current) => ({ ...current, reports: [...current.reports, report] }))
    setNotice('Gracias. Tu cartel aparece como pista sin confirmar hasta que otras personas lo voten.')
    show('result', 'push')
  }

  function cancelSearch() {
    window.history.back()
  }

  function searchAnother() {
    setQuery('')
    setResult(null)
    show('landing', 'push')
  }

  return (
    <>
      {renderScreen()}
      <CookieBanner />
    </>
  )

  function renderScreen() {
    if (screen === 'loading') {
      return <Loading query={query} step={step} onCancel={cancelSearch} />
    }

    if (screen === 'choose') {
      return <ChoosePlace query={query} places={choices} onPick={startSearch} onBack={() => window.history.back()} />
    }

    if (screen === 'result') {
      return <Result result={result} notice={notice} onSearchAnother={searchAnother} />
    }

    if (screen === 'empty') {
      return <NoSigns result={result} onAdded={signAdded} onSearchAnother={searchAnother} />
    }

    return <Landing initialQuery={query} error={error} onSearch={startSearch} />
  }
}

export default App
