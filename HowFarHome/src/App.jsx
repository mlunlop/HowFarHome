import { useEffect, useRef, useState } from 'react'
import CookieBanner from './components/CookieBanner.jsx'
import DebugPanel from './components/DebugPanel.jsx'
import ChoosePlace from './screens/ChoosePlace.jsx'
import Landing from './screens/Landing.jsx'
import Loading from './screens/Loading.jsx'
import Result from './screens/Result.jsx'
import { isPostcode, resolvePlaces } from './services/places.js'
import { SearchError, searchFarthestSign } from './services/searchFarthestSign.js'

//Un sitio ya localizado (de la lista de elección) trae coordenadas; el resto hay que buscarlo
const isResolvedPlace = (input) => typeof input === 'object' && input.lat !== undefined

function App() {
  const [screen, setScreen] = useState('landing')
  const [query, setQuery] = useState('')
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const searchRef = useRef(null)
  const placeRef = useRef(null)

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
    setScreen('loading')

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
          setScreen('choose')
          return
        }
        place = places[0]
      }

      setQuery(place.name)
      placeRef.current = place
      const found = await searchFarthestSign(place, {
        signal: search.signal,
        onProgress: setStep,
      })
      setResult(found)
      setScreen('result')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(
        err.userMessage ??
          'Los servidores de mapas no responden ahora mismo. Inténtalo de nuevo en unos minutos.',
      )
      setScreen('landing')
    }
  }

  function cancelSearch() {
    searchRef.current?.abort()
    setScreen('landing')
  }

  function searchAnother() {
    setQuery('')
    setResult(null)
    setScreen('landing')
  }

  //TEMPORAL: al cambiar las opciones de pruebas se repite la búsqueda que se está viendo
  function rerunSearch() {
    if (screen === 'result' && placeRef.current) startSearch(placeRef.current)
  }

  return (
    <>
      {renderScreen()}
      <CookieBanner />
      {import.meta.env.DEV && <DebugPanel onChange={rerunSearch} />}
    </>
  )

  function renderScreen() {
    if (screen === 'loading') {
      return <Loading query={query} step={step} onCancel={cancelSearch} />
    }

    if (screen === 'choose') {
      return <ChoosePlace query={query} places={choices} onPick={startSearch} onBack={() => setScreen('landing')} />
    }

    if (screen === 'result') {
      return <Result result={result} onSearchAnother={searchAnother} />
    }

    return <Landing initialQuery={query} error={error} onSearch={startSearch} />
  }
}

export default App
