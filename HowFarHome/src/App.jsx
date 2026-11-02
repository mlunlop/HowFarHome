import { useRef, useState } from 'react'
import Landing from './screens/Landing.jsx'
import Loading from './screens/Loading.jsx'
import Result from './screens/Result.jsx'
import { searchFarthestSign } from './services/searchFarthestSign.js'

function App() {
  const [screen, setScreen] = useState('landing')
  const [query, setQuery] = useState('')
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const searchRef = useRef(null)

  async function startSearch(name) {
    const search = new AbortController()
    searchRef.current = search
    setQuery(name)
    setStep(0)
    setError(null)
    setScreen('loading')

    try {
      const found = await searchFarthestSign(name, {
        signal: search.signal,
        onProgress: setStep,
      })
      setResult(found)
      setScreen('result')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(
        err.userMessage ??
          'Los servidores de OpenStreetMap están saturados ahora mismo. Inténtalo de nuevo en unos minutos.',
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

  if (screen === 'loading') {
    return <Loading query={query} step={step} onCancel={cancelSearch} />
  }

  if (screen === 'result') {
    return <Result result={result} onSearchAnother={searchAnother} />
  }

  return <Landing initialQuery={query} error={error} onSearch={startSearch} />
}

export default App
