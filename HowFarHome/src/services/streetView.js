import { bearingDegrees, distanceKm, movePoint } from './geo.js'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const METADATA_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata'
const EMBED_URL = 'https://www.google.com/maps/embed/v1/streetview'

// Los carteles se colocan antes del desvío: buscamos la foto un poco antes del ramal.
const LOOK_BACK_KM = 0.12
const SEARCH_RADIUS_M = 100
// Muy cerca del punto, el rumbo calculado es inestable y conviene el de la vía.
const MIN_BEARING_KM = 0.02

async function fetchMetadata(point, signal) {
  const query = new URLSearchParams({
    location: `${point.lat},${point.lng}`,
    radius: SEARCH_RADIUS_M,
    source: 'outdoor',
    key: API_KEY,
  })
  const response = await fetch(`${METADATA_URL}?${query}`, { signal })
  if (!response.ok) throw new Error(`Street View respondió ${response.status}`)

  const metadata = await response.json()
  return metadata.status === 'OK' ? metadata : null
}

// Devuelve la foto más cercana al cartel, o null si no hay clave o cobertura.
export async function findPanorama(sign, { signal } = {}) {
  if (!API_KEY) return null

  const viewpoints =
    sign.heading === null
      ? [sign]
      : [movePoint(sign, (sign.heading + 180) % 360, LOOK_BACK_KM), sign]

  for (const viewpoint of viewpoints) {
    const metadata = await fetchMetadata(viewpoint, signal)
    if (!metadata) continue

    const pano = { lat: metadata.location.lat, lng: metadata.location.lng }
    const heading =
      distanceKm(pano, sign) < MIN_BEARING_KM && sign.heading !== null
        ? sign.heading
        : bearingDegrees(pano, sign)

    return { panoId: metadata.pano_id, heading, date: metadata.date ?? null }
  }

  return null
}

export function embedUrl({ panoId, heading }) {
  const query = new URLSearchParams({
    key: API_KEY,
    pano: panoId,
    heading,
    pitch: 5,
    fov: 70,
    language: 'es',
  })
  return `${EMBED_URL}?${query}`
}

// Enlace público de Google Maps: funciona aunque no haya clave.
export function mapsUrl(sign, panorama) {
  const query = new URLSearchParams({
    api: 1,
    map_action: 'pano',
    viewpoint: `${sign.lat},${sign.lng}`,
  })
  const heading = panorama?.heading ?? sign.heading
  if (heading !== null && heading !== undefined) query.set('heading', heading)
  return `https://www.google.com/maps/@?${query}`
}
