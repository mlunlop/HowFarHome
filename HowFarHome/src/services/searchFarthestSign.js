import { bearingDegrees } from './geo.js'
import { describeLocation, findMunicipality } from './nominatim.js'
import { findRoute } from './osrm.js'
import { fetchSignElements } from './overpass.js'
import { extractSigns, normalizeName } from './signs.js'
import { findPanorama } from './streetView.js'

export const SEARCH_STEPS = [
  'Localizando el municipio',
  'Rastreando carteles en OpenStreetMap (1-2 min)',
  'Midiendo la vuelta a casa',
  'Buscando la foto en Street View',
]

const SETTLE_DURATION_MS = 450
const WALKING_KMH = 5
const CACHE_PREFIX = 'howfarhome:v1:'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Error con un mensaje pensado para enseñárselo a la persona que busca.
export class SearchError extends Error {
  constructor(userMessage) {
    super(userMessage)
    this.userMessage = userMessage
  }
}

function readCache(query) {
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_PREFIX + normalizeName(query)))
    return entry && Date.now() - entry.savedAt < CACHE_TTL_MS ? entry.result : null
  } catch {
    return null
  }
}

function writeCache(query, result) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + normalizeName(query),
      JSON.stringify({ savedAt: Date.now(), result }),
    )
  } catch {
    // Sin almacenamiento disponible simplemente se repite la búsqueda.
  }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Búsqueda cancelada', 'AbortError'))
      },
      { once: true },
    )
  })
}

// Estos datos enriquecen el resultado: si fallan, el cartel sigue siendo válido.
async function optional(request, signal) {
  try {
    return await request()
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

export async function searchFarthestSign(query, { signal, onProgress } = {}) {
  const cached = readCache(query)
  if (cached) {
    onProgress?.(SEARCH_STEPS.length)
    await wait(SETTLE_DURATION_MS, signal)
    return cached
  }

  onProgress?.(0)
  const municipality = await findMunicipality(query, { signal })
  if (!municipality) {
    throw new SearchError(`No encontramos ningún municipio llamado «${query}» en España.`)
  }

  onProgress?.(1)
  const elements = await fetchSignElements(municipality.name, { signal })
  const signs = extractSigns(elements, municipality)
  if (!signs.length) {
    throw new SearchError(
      `OpenStreetMap no tiene ningún cartel de carretera que mencione ${municipality.name}.`,
    )
  }

  onProgress?.(2)
  const [farthest] = signs
  const nearest = signs.at(-1)
  const home = { lat: municipality.lat, lng: municipality.lng }
  const [route, location] = await Promise.all([
    optional(() => findRoute(farthest, home, { signal }), signal),
    optional(() => describeLocation(farthest, { signal }), signal),
  ])

  onProgress?.(3)
  const panorama = await optional(() => findPanorama(farthest, { signal }), signal)

  onProgress?.(SEARCH_STEPS.length)
  await wait(SETTLE_DURATION_MS, signal)

  const result = {
    municipality: municipality.name,
    region: municipality.region,
    distanceKm: farthest.distanceKm,
    nearestKm: nearest.distanceKm,
    roadDistanceKm: route?.distanceKm ?? null,
    driveMinutes: route?.durationMinutes ?? null,
    walkHours: (route?.distanceKm ?? farthest.distanceKm) / WALKING_KMH,
    signsFound: signs.length,
    bearingDegrees: bearingDegrees(farthest, home),
    sign: { ...farthest, place: location?.place ?? null, region: location?.region ?? null },
    panorama,
  }

  writeCache(query, result)
  return result
}
