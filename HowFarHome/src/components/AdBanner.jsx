import { useEffect, useRef } from 'react'
import { useConsent } from '../services/consent.js'
import { ADSENSE_CLIENT, ADSENSE_SLOT, adsEnabled } from '../site.js'

const SCRIPT_ID = 'adsense-script'

// El script de AdSense solo se descarga tras aceptar «Publicidad» en el banner de cookies.
function loadScript() {
  if (document.getElementById(SCRIPT_ID)) return
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
  document.head.append(script)
}

function AdBanner() {
  const consent = useConsent()
  const slotRef = useRef(null)
  const show = adsEnabled && consent?.ads

  useEffect(() => {
    if (!show || slotRef.current?.dataset.adsbygoogleStatus) return
    loadScript()
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Un bloqueador de anuncios no debe romper la página.
    }
  }, [show])

  if (!show) return null

  return (
    <aside aria-label="Publicidad" className="mx-auto mb-4 w-full max-w-[728px]">
      <span className="mb-1 block text-[10px] tracking-wider text-white/40 uppercase">Publicidad</span>
      <ins
        ref={slotRef}
        className="adsbygoogle block h-[90px] w-full max-sm:h-[60px]"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-full-width-responsive="false"
      />
    </aside>
  )
}

export default AdBanner
