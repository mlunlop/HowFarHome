import { useState } from 'react'
import { closePreferences, getConsent, saveConsent, useConsent, usePreferencesOpen } from '../services/consent.js'
import { adsEnabled } from '../site.js'

const OPTIONS = [
  {
    key: 'external',
    title: 'Contenido de terceros',
    text: 'Muestra Street View de Google dentro de la web. Google puede instalar sus propias cookies y recibir tu dirección IP.',
  },
  {
    key: 'ads',
    title: 'Publicidad',
    text: 'Un único banner de Google AdSense. Google y sus socios usan cookies para mostrar y medir anuncios, personalizados o no.',
    hidden: !adsEnabled,
  },
]

const buttonClass =
  'h-11 cursor-pointer rounded-lg px-5 text-sm font-semibold transition-[background-color,color,transform] active:scale-[0.98]'
//Aceptar y rechazar con el mismo peso visual, como pide la AEPD
const choiceClass = `${buttonClass} bg-white text-black hover:bg-signal`
const quietClass = `${buttonClass} border border-white/25 text-white hover:border-white`

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-signal' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

function Preferences({ onDone }) {
  const saved = getConsent()
  const [choice, setChoice] = useState({ external: saved?.external ?? false, ads: saved?.ads ?? false })
  const visible = OPTIONS.filter((option) => !option.hidden)

  return (
    <>
      <h2 id="cookie-title" className="font-display text-xl font-semibold text-signal">
        Configurar cookies
      </h2>
      <ul className="mt-4 divide-y divide-white/10">
        <li className="flex items-start justify-between gap-4 py-3">
          <span>
            <span className="block font-medium text-white">Necesarias</span>
            <span className="mt-0.5 block text-sm text-white/60">
              Guardan en tu navegador tus votos, la caché de búsquedas y esta elección. No identifican a nadie.
            </span>
          </span>
          <Toggle checked disabled label="Necesarias (siempre activas)" onChange={() => {}} />
        </li>
        {visible.map((option) => (
          <li key={option.key} className="flex items-start justify-between gap-4 py-3">
            <span>
              <span className="block font-medium text-white">{option.title}</span>
              <span className="mt-0.5 block text-sm text-white/60">{option.text}</span>
            </span>
            <Toggle
              checked={choice[option.key]}
              label={option.title}
              onChange={(value) => setChoice((all) => ({ ...all, [option.key]: value }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={quietClass} onClick={onDone}>
          Volver
        </button>
        <button type="button" className={choiceClass} onClick={() => saveConsent(choice)}>
          Guardar mi elección
        </button>
      </div>
    </>
  )
}

function CookieBanner() {
  const consent = useConsent()
  const preferencesOpen = usePreferencesOpen()
  const [configuring, setConfiguring] = useState(false)

  if (consent && !preferencesOpen) return null
  const showPreferences = configuring || preferencesOpen

  function back() {
    setConfiguring(false)
    if (consent) closePreferences()
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] flex justify-center p-3 sm:p-4">
      <section
        role="dialog"
        aria-labelledby="cookie-title"
        className="pointer-events-auto max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-ground p-5 text-left shadow-2xl shadow-black/70"
      >
        {showPreferences ? (
          <Preferences onDone={back} />
        ) : (
          <>
            <h2 id="cookie-title" className="font-display text-xl font-semibold text-signal">
              Tu privacidad
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Usamos almacenamiento local necesario para que la web funcione. Con tu permiso, también
              cargamos Street View de Google
              {adsEnabled ? ' y un banner de publicidad de Google AdSense, que instalan' : ', que instala'}{' '}
              cookies de terceros. Puedes cambiar de opinión cuando quieras desde «Cookies» al pie de página.{' '}
              <a href="/cookies/" className="underline decoration-signal underline-offset-4 hover:text-white">
                Más información
              </a>
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={quietClass} onClick={() => setConfiguring(true)}>
                Configurar
              </button>
              <button type="button" className={choiceClass} onClick={() => saveConsent({})}>
                Rechazar todo
              </button>
              <button type="button" className={choiceClass} onClick={() => saveConsent({ external: true, ads: true })}>
                Aceptar todo
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default CookieBanner
