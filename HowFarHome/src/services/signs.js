import { bearingDegrees, distanceKm } from './geo.js'

// Etiquetas de OSM que transcriben lo que pone un cartel de dirección.
export const DESTINATION_KEYS = ['destination', 'destination:forward', 'destination:backward']

const NON_ROAD_HIGHWAYS = new Set([
  'bridleway', 'corridor', 'cycleway', 'footway', 'path', 'pedestrian', 'steps', 'track',
])

// Un núcleo a menos de esta distancia del municipio se considera el mismo sitio.
const SAME_PLACE_KM = 5

export function normalizeName(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// "Donostia / San Sebastián" aparece en los carteles con cualquiera de sus dos nombres.
export function nameVariants(name) {
  return name.split('/').map((part) => part.trim()).filter(Boolean)
}

// Compara el destino completo: "Parque Natural de Cazorla" no es un cartel de Cazorla.
function mentions(destination, names) {
  return destination.split(/[;,|]/).some((part) => names.has(normalizeName(part)))
}

function isRoadElement(tags) {
  if (tags.tourism === 'information' || tags.information) return false
  return !NON_ROAD_HIGHWAYS.has(tags.highway)
}

function locate(element, key) {
  if (element.type === 'node') {
    return { point: { lat: element.lat, lng: element.lon }, heading: null }
  }
  const nodes = element.geometry?.map(({ lat, lon }) => ({ lat, lng: lon })) ?? []
  if (!nodes.length) return null
  if (key === 'destination:backward') nodes.reverse()
  return {
    point: nodes[0],
    heading: nodes.length > 1 ? bearingDegrees(nodes[0], nodes[1]) : null,
  }
}

function nearestIsHome(point, home, homonyms) {
  const fromHome = distanceKm(point, home)
  return homonyms.every((other) => distanceKm(point, other) >= fromHome)
}

// Devuelve los carteles que nombran al municipio, del más lejano al más cercano.
export function extractSigns(elements, municipality) {
  const home = { lat: municipality.lat, lng: municipality.lng }
  const names = new Set(nameVariants(municipality.name).map(normalizeName))

  const homonyms = elements
    .filter((element) => element.tags?.place)
    .map(({ lat, lon }) => ({ lat, lng: lon }))
    .filter((place) => distanceKm(place, home) > SAME_PLACE_KM)

  const seen = new Set()
  const signs = []

  for (const element of elements) {
    const tags = element.tags ?? {}
    if (tags.place || !isRoadElement(tags)) continue

    const key = DESTINATION_KEYS.find((k) => tags[k] && mentions(tags[k], names))
    if (!key) continue

    const location = locate(element, key)
    if (!location || !nearestIsHome(location.point, home, homonyms)) continue

    // Los ramales de un mismo cruce cuentan como un solo cartel (unos 100 m).
    const spot = `${location.point.lat.toFixed(3)},${location.point.lng.toFixed(3)}`
    if (seen.has(spot)) continue
    seen.add(spot)

    signs.push({
      ...location.point,
      heading: location.heading,
      distanceKm: distanceKm(location.point, home),
      text: tags[key],
      road: tags.ref ?? null,
      badge: tags['destination:ref'] ?? tags.ref ?? null,
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    })
  }

  return signs.sort((a, b) => b.distanceKm - a.distanceKm)
}
