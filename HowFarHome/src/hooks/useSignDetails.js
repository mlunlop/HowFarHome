import { useEffect, useState } from 'react'
import { describeLocation } from '../services/nominatim.js'
import { findRoute } from '../services/osrm.js'
import { checkSignInPhotos, photoCheckAvailable } from '../services/photoCheck.js'
import { findPanorama } from '../services/streetView.js'

// Estos datos enriquecen el candidato: si un servicio falla, se queda en null.
const settle = (promise) => promise.catch(() => null)

// Ruta, lugar y foto del candidato elegido. Se piden al seleccionarlo y se recuerdan.
export function useSignDetails(sign, home) {
  const [details, setDetails] = useState({})
  const current = details[sign.key]

  useEffect(() => {
    if (current) return
    const controller = new AbortController()
    const options = { signal: controller.signal }

    Promise.all([
      settle(findRoute(sign, home, options)),
      settle(describeLocation(sign, options)),
      settle(findPanorama(sign, options)),
    ]).then(([route, location, panorama]) => {
      if (!controller.signal.aborted) {
        setDetails((all) => ({ ...all, [sign.key]: { route, location, panorama } }))
      }
    })

    return () => controller.abort()
  }, [sign, home, current])

  return current ?? null
}

// Comprueba en segundo plano, uno tras otro, si las fotos de Mapillary muestran el nombre.
export function usePhotoChecks(candidates, municipality) {
  const [checks, setChecks] = useState({})

  useEffect(() => {
    if (!photoCheckAvailable) return
    const controller = new AbortController()

    ;(async () => {
      for (const sign of candidates) {
        if (controller.signal.aborted) return
        setChecks((all) => ({ ...all, [sign.key]: { status: 'checking' } }))
        const check = await checkSignInPhotos(sign, municipality, { signal: controller.signal })
          .catch(() => ({ status: 'error' }))
        if (controller.signal.aborted) return
        setChecks((all) => ({ ...all, [sign.key]: check }))
      }
    })()

    return () => controller.abort()
  }, [candidates, municipality])

  return checks
}
