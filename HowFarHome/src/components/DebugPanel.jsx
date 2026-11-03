import { useState } from 'react'
import { debugOptions, setDebugOptions, SOURCE_MODES } from '../services/debugOptions.js'

// TEMPORAL: panel de pruebas para comparar OSM con las fotos escaneadas. Solo en desarrollo.
function DebugPanel({ onChange }) {
  const [options, setOptions] = useState(debugOptions)

  function update(change) {
    const next = { ...options, ...change }
    setOptions(next)
    setDebugOptions(next)
    onChange()
  }

  return (
    <aside className="fixed right-4 bottom-4 z-50 rounded-xl border border-dashed border-signal/60 bg-ground/95 p-3 text-sm text-white shadow-lg backdrop-blur">
      <p className="mb-2 text-xs font-semibold tracking-wide text-signal uppercase">Pruebas</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Fuentes de carteles">
        {Object.entries(SOURCE_MODES).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={options.sources === value}
            onClick={() => update({ sources: value })}
            className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
              options.sources === value ? 'bg-signal text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={options.shared}
          onChange={(event) => update({ shared: event.target.checked })}
          className="accent-signal"
        />
        Votos y correcciones de Supabase
      </label>
    </aside>
  )
}

export default DebugPanel
