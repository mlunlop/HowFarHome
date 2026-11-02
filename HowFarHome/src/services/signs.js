import { bearingDegrees, distanceKm } from './geo.js'

// Etiquetas de OSM que transcriben lo que pone un cartel de dirección.
export const DESTINATION_KEYS = ['destination', 'destination:forward', 'destination:backward']

// Clases de vía cuyo nombre puede ser "Carretera de X a <municipio>".
export const NAMED_ROAD_HIGHWAYS = ['trunk', 'primary', 'secondary', 'tertiary', 'unclassified']

const NON_ROAD_HIGHWAYS = new Set([
  'bridleway', 'corridor', 'cycleway', 'footway', 'path', 'pedestrian', 'steps', 'track',
])

// Un núcleo a menos de esta distancia del municipio se considera el mismo sitio.
const SAME_PLACE_KM = 5
// Carteles más cerca que esto entre sí son el mismo cruce para la lista de candidatos.
const CANDIDATE_SEPARATION_KM = 1.5
const MAX_CANDIDATES = 6

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

export function signKey(point) {
  return `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
}

// Compara el destino completo: "Parque Natural de Cazorla" no es un cartel de Cazorla.
function mentions(destination, names) {
  return destination.split(/[;,|]/).some((part) => names.has(normalizeName(part)))
}

// "Carretera de A-401 a Peal de Becerro" lleva a Peal: su otro extremo suele tener cartel.
// El nombre debe acabar ahí: "de Sevilla La Nueva" no lleva a Sevilla.
const ROAD_NAME_END = /^(\s*$|\s+(a|por|hacia|y)\s|\s*[-–,(/])/

function roadLeadsTo(roadName, names) {
  const road = ` ${normalizeName(roadName)} `
  return [...names].some((name) =>
    [' de ', ' a ', ' hacia '].some((joint) => {
      let at = road.indexOf(`${joint}${name}`)
      while (at !== -1) {
        if (ROAD_NAME_END.test(road.slice(at + joint.length + name.length))) return true
        at = road.indexOf(`${joint}${name}`, at + 1)
      }
      return false
    }),
  )
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

function destinationSigns(elements, names) {
  const signs = []
  for (const element of elements) {
    const tags = element.tags ?? {}
    if (tags.place || !isRoadElement(tags)) continue

    const key = DESTINATION_KEYS.find((k) => tags[k] && mentions(tags[k], names))
    if (!key) continue

    const location = locate(element, key)
    if (!location) continue

    signs.push({
      ...location.point,
      heading: location.heading,
      source: 'destination',
      text: tags[key],
      road: tags.ref ?? null,
      badge: tags['destination:ref'] ?? tags.ref ?? null,
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    })
  }
  return signs
}

// Un candidato por carretera: el extremo más alejado del municipio.
function namedRoadSigns(elements, names, home) {
  const ends = new Map()
  for (const element of elements) {
    const tags = element.tags ?? {}
    if (element.type !== 'way' || !tags.name || !element.geometry) continue
    if (!NAMED_ROAD_HIGHWAYS.includes(tags.highway) || !roadLeadsTo(tags.name, names)) continue

    const nodes = element.geometry.map(({ lat, lon }) => ({ lat, lng: lon }))
    nodes.forEach((node, index) => {
      const distance = distanceKm(node, home)
      if (distance <= (ends.get(tags.name)?.distance ?? -1)) return
      const neighbour = nodes[index + 1] ?? nodes[index - 1]
      ends.set(tags.name, {
        distance,
        sign: {
          ...node,
          heading: neighbour ? bearingDegrees(node, neighbour) : null,
          source: 'road-name',
          text: tags.name,
          road: tags.ref ?? null,
          badge: tags.ref ?? null,
          osmUrl: `https://www.openstreetmap.org/way/${element.id}`,
        },
      })
    })
  }
  return [...ends.values()].map(({ sign }) => sign)
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

  for (const sign of [...destinationSigns(elements, names), ...namedRoadSigns(elements, names, home)]) {
    if (!nearestIsHome(sign, home, homonyms)) continue

    // Los ramales de un mismo cruce cuentan como un solo cartel (unos 100 m).
    const spot = `${sign.lat.toFixed(3)},${sign.lng.toFixed(3)}`
    if (seen.has(spot)) continue
    seen.add(spot)

    signs.push({ ...sign, key: signKey(sign), distanceKm: distanceKm(sign, home) })
  }

  return signs.sort((a, b) => b.distanceKm - a.distanceKm)
}

// Los más lejanos, saltando los que están en el mismo cruce que uno ya elegido.
export function pickCandidates(signs) {
  const picked = []
  for (const sign of signs) {
    if (picked.some((other) => distanceKm(sign, other) < CANDIDATE_SEPARATION_KM)) continue
    picked.push(sign)
    if (picked.length === MAX_CANDIDATES) break
  }
  return picked
}
