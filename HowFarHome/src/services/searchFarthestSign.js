import { debugOptions, filterBySource } from './debugOptions.js'
import { fetchSignElements } from './overpass.js'
import { fetchIndexedElements } from './signIndex.js'
import { extractSigns, normalizeName, pickCandidates } from './signs.js'
import { fetchReports } from './reports.js'
import { fetchVotes } from './votes.js'

export const SEARCH_STEPS = [
  'Localizando el municipio',
  'Rastreando carteles en OpenStreetMap',
  'Consultando lo que han verificado otros',
]

const SETTLE_DURATION_MS = 450
const CACHE_PREFIX = 'howfarhome:v4:'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Error con un mensaje pensado para enseñárselo a la persona que busca.
export class SearchError extends Error {
  constructor(userMessage) {
    super(userMessage)
    this.userMessage = userMessage
  }
}

// Distingue municipios homónimos: la clave lleva las coordenadas.
function placeKey(place) {
  return `${normalizeName(place.name)}@${place.lat.toFixed(2)},${place.lng.toFixed(2)}`
}

function readCache(key) {
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_PREFIX + key))
    return entry && Date.now() - entry.savedAt < CACHE_TTL_MS ? entry.result : null
  } catch {
    return null
  }
}

function writeCache(key, result) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
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

async function findCandidates(municipality, sources, signal) {
  // Sin índice generado (por ejemplo, en un clon recién hecho) se recurre a Overpass.
  const elements =
    (await fetchIndexedElements(municipality.name, { signal })) ??
    (await fetchSignElements(municipality.name, { signal }))
  const signs = extractSigns(filterBySource(elements, sources), municipality)
  if (!signs.length) {
    throw new SearchError(
      `OpenStreetMap no tiene ningún cartel de carretera que mencione ${municipality.name}.`,
    )
  }

  const home = { lat: municipality.lat, lng: municipality.lng }
  return {
    municipality: municipality.name,
    region: municipality.region,
    home,
    municipalityKey: placeKey(municipality),
    signsFound: signs.length,
    nearestKm: signs.at(-1).distanceKm,
    candidates: pickCandidates(signs),
  }
}

// Recibe un sitio ya localizado (ver places.js). El paso 0, localizarlo, lo marca quien llama.
// Los candidatos se guardan en caché; los votos se piden siempre de nuevo.
export async function searchFarthestSign(place, { signal, onProgress } = {}) {
  onProgress?.(1)
  const { sources, shared } = debugOptions()
  const key = sources === 'all' ? placeKey(place) : `${sources}:${placeKey(place)}`
  let found = readCache(key)
  if (!found) {
    found = await findCandidates(place, sources, signal)
    writeCache(key, found)
  }

  onProgress?.(2)
  // Si Supabase falla, se enseñan los carteles de OSM sin votos ni aportaciones.
  const fallback = (empty) => (error) => {
    if (signal?.aborted) throw error
    return empty
  }
  const [votes, reports] = shared
    ? await Promise.all([
        fetchVotes(found.municipalityKey, { signal }).catch(fallback({})),
        fetchReports(found.municipalityKey, { signal }).catch(fallback([])),
      ])
    : [{}, []]

  onProgress?.(SEARCH_STEPS.length)
  await wait(SETTLE_DURATION_MS, signal)
  return { ...found, votes, reports }
}
