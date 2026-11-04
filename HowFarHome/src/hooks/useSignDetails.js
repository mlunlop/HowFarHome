import { useEffect, useState } from 'react'
import { describeLocation } from '../services/nominatim.js'
import { findRoute } from '../services/osrm.js'
import { findPanorama } from '../services/streetView.js'

//Estos datos enriquecen el candidato: si un servicio falla, se queda en null
const settle = (promise) => promise.catch(() => null)

//Ruta, lugar y foto del candidato elegido, se piden al seleccionarlo y se recuerdan
export function useSignDetails(sign, home) {
  const [details, setDetails] = useState({})
  const detailKey = `${sign.key}@${sign.lat},${sign.lng}`
  const current = details[detailKey]

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
        setDetails((all) => ({ ...all, [detailKey]: { route, location, panorama } }))
      }
    })

    return () => controller.abort()
  }, [sign, home, current, detailKey])

  return current ?? null
}
