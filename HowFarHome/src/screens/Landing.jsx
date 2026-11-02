import { useState } from 'react'

const EXAMPLE = 'Peal de Becerro'

function Landing({ initialQuery, error, onSearch }) {
  const [value, setValue] = useState(initialQuery)
  const name = value.trim()

  function handleSubmit(event) {
    event.preventDefault()
    if (name) onSearch(name)
  }

  return (
    <main className="relative flex min-h-dvh animate-screen-in flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <h1 className="font-display text-[clamp(3rem,12vw,8rem)] leading-none font-bold tracking-tight text-signal">
        HowFarHome?
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-10 flex w-full max-w-xl items-center rounded-xl border border-white/25 bg-black p-1.5 transition-colors focus-within:border-signal sm:mt-12"
      >
        <label htmlFor="municipality" className="sr-only">
          Nombre del municipio
        </label>
        <input
          id="municipality"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="¿De dónde eres?"
          maxLength={80}
          autoComplete="off"
          autoFocus
          className="h-12 min-w-0 flex-1 bg-transparent pr-2 pl-3.5 text-lg text-white outline-none placeholder:text-white/50"
        />
        <button
          type="submit"
          disabled={!name}
          aria-label="Buscar"
          className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-lg bg-signal text-black transition-[background-color,color,transform] hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-signal">
          {error}
        </p>
      )}

      <p className="mt-8 max-w-lg text-base leading-relaxed text-pretty text-white sm:text-lg">
        Escribe tu municipio y encontramos el cartel de carretera más lejano que
        lo menciona: a cuántos kilómetros está de casa y cómo se ve en Street View.
      </p>

      <button
        type="button"
        onClick={() => onSearch(EXAMPLE)}
        className="mt-4 cursor-pointer text-sm text-white/60 underline decoration-signal underline-offset-4 transition-colors hover:text-white"
      >
        Prueba con {EXAMPLE}
      </button>

      <div
        aria-hidden="true"
        className="dashed-line absolute bottom-0 left-1/2 hidden h-[12vh] w-1 -translate-x-1/2 mask-t-from-20% [@media(min-height:720px)]:block"
      />
    </main>
  )
}

export default Landing
