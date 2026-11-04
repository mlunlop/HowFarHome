import { allow, useConsent } from '../services/consent.js'

//Google instala cookies al mostrar Street View: sin permiso se enseña esto en su lugar
function StreetViewGate({ children }) {
  const consent = useConsent()
  if (consent?.external) return children

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="max-w-sm text-sm text-pretty text-white/70">
        Street View lo sirve Google, que instala sus propias cookies. Cárgalo para ver la foto del cartel.
      </p>
      <button
        type="button"
        onClick={() => allow('external')}
        className="h-11 cursor-pointer rounded-lg bg-signal px-5 text-sm font-semibold text-black transition-[background-color,transform] hover:bg-white active:scale-[0.98]"
      >
        Cargar Street View
      </button>
      <a href="/cookies/" className="text-xs text-white/60 underline decoration-signal underline-offset-4 hover:text-white">
        Política de cookies
      </a>
    </div>
  )
}

export default StreetViewGate
