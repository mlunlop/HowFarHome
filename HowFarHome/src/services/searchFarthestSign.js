import { fetchSignElements } from './overpass.js'
import { fetchIndexedElements, indexVersion } from './signIndex.js'
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

//Error con un mensaje pensado para enseñárselo a la persona que busca
export class SearchError extends Error {
  constructor(userMessage) {
    super(userMessage)
    this.userMessage = userMessage
  }
}

//Distingue municipios homónimos: la clave lleva las coordenadas
function placeKey(place) {
  return `${normalizeName(place.name)}@${place.lat.toFixed(2)},${place.lng.toFixed(2)}`
}

//Una búsqueda guardada con otro índice puede haber perdido carteles nuevos: se repite
function readCache(key, version) {
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_PREFIX + key))
    const fresh = entry && entry.version === version && Date.now() - entry.savedAt < CACHE_TTL_MS
    return fresh ? entry.result : null
  } catch {
    return null
  }
}

function writeCache(key, version, result) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ savedAt: Date.now(), version, result }),
    )
  } catch {
    //Sin almacenamiento disponible simplemente se repite la búsqueda
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

async function findCandidates(municipality, signal) {
  //Los carteles pueden usar otro nombre oficial («Lleida» para «Lérida»): se buscan todos
  //El nombre que se muestra y la clave de los votos siguen siendo los de siempre
  const signName = [municipality.name, ...(municipality.aliases ?? [])].join(' / ')
  //Sin índice generado (por ejemplo, en un clon recién hecho) se recurre a Overpass
  const elements =
    (await fetchIndexedElements(signName, { signal })) ??
    (await fetchSignElements(signName, { signal }))
  const signs = extractSigns(elements, { ...municipality, name: signName })

  //Sin carteles no es un error: puede que alguien ya haya añadido uno, o que lo añada ahora
  const home = { lat: municipality.lat, lng: municipality.lng }
  return {
    municipality: municipality.name,
    region: municipality.region,
    home,
    municipalityKey: placeKey(municipality),
    signsFound: signs.length,
    nearestKm: signs.at(-1)?.distanceKm ?? null,
    candidates: pickCandidates(signs),
  }
}

//Recibe un sitio ya localizado (ver places.js), el paso 0 lo marca quien llama
//Los candidatos se guardan en caché; los votos se piden siempre de nuevo
export async function searchFarthestSign(place, { signal, onProgress } = {}) {
  onProgress?.(1)
  const key = placeKey(place)
  const version = await indexVersion({ signal })
  let found = readCache(key, version)
  if (!found) {
    found = await findCandidates(place, signal)
    //Una búsqueda vacía no se guarda: si se mapea un cartel, se verá al volver
    if (found.candidates.length) writeCache(key, version, found)
  }

  onProgress?.(2)
  //Si Supabase falla, se enseñan los carteles de OSM sin votos ni aportaciones
  const fallback = (empty) => (error) => {
    if (signal?.aborted) throw error
    return empty
  }
  const [votes, reports] = await Promise.all([
    fetchVotes(found.municipalityKey, { signal }).catch(fallback({})),
    fetchReports(found.municipalityKey, { signal }).catch(fallback([])),
  ])

  onProgress?.(SEARCH_STEPS.length)
  await wait(SETTLE_DURATION_MS, signal)
  return { ...found, votes, reports }
}
