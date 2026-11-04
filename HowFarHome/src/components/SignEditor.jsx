import { useEffect, useState } from 'react'
import { distanceKm, formatKm } from '../services/geo.js'
import { MAX_MOVE_KM, MAX_NOTE_LENGTH } from '../services/reports.js'
import { freeEmbedUrl } from '../services/streetView.js'
import LocationPicker from './LocationPicker.jsx'

const PREVIEW_DELAY_MS = 600
//Por debajo de esto no merece la pena guardar una corrección
const MIN_MOVE_KM = 0.01

const COPY = {
  add: {
    title: 'Añadir un cartel que falta',
    help: 'Toca el mapa o arrastra el marcador hasta el cartel. Comprueba en Street View que está ahí.',
    save: 'Añadir cartel',
  },
  move: {
    title: 'Corregir la posición del cartel',
    help: 'Arrastra el marcador hasta donde está el cartel de verdad, como mucho a 2 km.',
    save: 'Guardar posición',
  },
}

//mode: 'add' | 'move'. origin: posición actual del cartel al corregirlo
function SignEditor({ mode, municipality, start, origin, onSave, onClose }) {
  const [point, setPoint] = useState(start)
  const [preview, setPreview] = useState(start)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const copy = COPY[mode]
  const movedKm = origin ? distanceKm(point, origin) : null

  //La vista de Street View se actualiza al dejar quieto el marcador, no en cada movimiento
  useEffect(() => {
    const timer = setTimeout(() => setPreview(point), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [point])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tooFar = movedKm !== null && movedKm > MAX_MOVE_KM
  const unchanged = movedKm !== null && movedKm < MIN_MOVE_KM

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(point, note)
    } catch (err) {
      setError(
        err.rateLimited
          ? 'Has hecho muchas aportaciones seguidas. Espera un rato y vuelve a intentarlo.'
          : 'No se pudo guardar. Inténtalo de nuevo.',
      )
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="flex max-h-dvh w-full max-w-4xl flex-col overflow-y-auto rounded-t-xl border border-white/15 bg-ground sm:rounded-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/15 px-4 py-3 sm:px-5">
          <div>
            <h2 id="editor-title" className="font-display text-lg font-semibold text-signal">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-white/60">{copy.help}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="grid gap-px bg-white/15 md:grid-cols-2">
          <div className="h-72 bg-ground md:h-96">
            <LocationPicker
              center={start}
              value={point}
              onChange={setPoint}
              limit={origin && { center: origin, radiusKm: MAX_MOVE_KM }}
              //Un cartel nuevo puede estar lejos del pueblo: se empieza con vista de comarca
              zoom={mode === 'add' ? 11 : 17}
            />
          </div>
          <div className="relative h-56 bg-neutral-950 md:h-96">
            <iframe
              key={`${preview.lat},${preview.lng}`}
              title="Street View del punto elegido"
              src={freeEmbedUrl({ ...preview, heading: null })}
              className="absolute inset-0 size-full"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {mode === 'add' && (
            <div>
              <label htmlFor="sign-note" className="text-sm text-white/60">
                ¿Qué pone el cartel? (opcional)
              </label>
              <input
                id="sign-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={MAX_NOTE_LENGTH}
                placeholder={`Por ejemplo: ${municipality} 40, Úbeda 12`}
                className="mt-1 h-11 w-full rounded-lg border border-white/25 bg-transparent px-3 text-white outline-none transition-colors placeholder:text-white/40 focus:border-signal"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/60 tabular-nums">
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              {movedKm !== null && ` · movido ${formatKm(movedKm)} km`}
            </p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 cursor-pointer rounded-lg border border-white/25 px-5 font-semibold text-white transition-colors hover:border-white sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || tooFar || unchanged}
                className="h-11 flex-1 cursor-pointer rounded-lg bg-signal px-5 font-semibold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {saving ? 'Guardando…' : copy.save}
              </button>
            </div>
          </div>

          {tooFar && (
            <p role="alert" className="text-sm text-signal">
              Eso está a más de {MAX_MOVE_KM} km del cartel original. Si es otro cartel, añádelo como cartel nuevo.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-signal">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export default SignEditor
