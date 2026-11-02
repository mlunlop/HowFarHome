// Búsqueda simulada: todos los datos son inventados. Para conectar OpenStreetMap
// y Street View basta con reimplementar searchFarthestSign con este mismo contrato.

export const SEARCH_STEPS = [
  'Localizando el municipio',
  'Rastreando carteles en OpenStreetMap',
  'Midiendo la distancia de cada cartel',
  'Buscando la foto en Street View',
]

const STEP_DURATION_MS = 950
const SETTLE_DURATION_MS = 450

const MOCK_SIGNS = [
  { road: 'A-1', roadKm: 161, place: 'Aranda de Duero', province: 'Burgos', lat: 41.67, lng: -3.69 },
  { road: 'A-2', roadKm: 327, place: 'Alfajarín', province: 'Zaragoza', lat: 41.61, lng: -0.7 },
  { road: 'A-3', roadKm: 191, place: 'Motilla del Palancar', province: 'Cuenca', lat: 39.57, lng: -1.91 },
  { road: 'A-4', roadKm: 200, place: 'Valdepeñas', province: 'Ciudad Real', lat: 38.76, lng: -3.38 },
  { road: 'A-5', roadKm: 180, place: 'Navalmoral de la Mata', province: 'Cáceres', lat: 39.89, lng: -5.54 },
  { road: 'A-6', roadKm: 187, place: 'Tordesillas', province: 'Valladolid', lat: 41.5, lng: -5 },
  { road: 'A-7', roadKm: 549, place: 'Puerto Lumbreras', province: 'Murcia', lat: 37.56, lng: -1.81 },
]

function hashName(name) {
  let hash = 2166136261
  for (const char of name.toLowerCase()) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619)
  }
  return hash >>> 0
}

// El mismo municipio devuelve siempre el mismo resultado.
function buildMockResult(municipality) {
  const seed = hashName(municipality)
  const pick = (salt, min, max) => {
    const value = Math.imul(seed ^ salt, 2654435761) >>> 0
    return min + (value % (max - min + 1))
  }

  const distanceKm = pick(11, 120, 640)
  const roadDistanceKm = Math.round(distanceKm * (pick(23, 115, 135) / 100))

  return {
    municipality,
    distanceKm,
    roadDistanceKm,
    driveMinutes: Math.round((roadDistanceKm / 95) * 60),
    walkHours: Math.round(roadDistanceKm / 5),
    signsFound: pick(37, 6, 94),
    fartherThanPercent: pick(41, 52, 99),
    bearingDegrees: pick(53, 0, 359),
    sign: MOCK_SIGNS[seed % MOCK_SIGNS.length],
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

export async function searchFarthestSign(municipality, { signal, onProgress } = {}) {
  for (let step = 0; step < SEARCH_STEPS.length; step++) {
    onProgress?.(step)
    await wait(STEP_DURATION_MS, signal)
  }
  onProgress?.(SEARCH_STEPS.length)
  await wait(SETTLE_DURATION_MS, signal)

  return buildMockResult(municipality)
}
