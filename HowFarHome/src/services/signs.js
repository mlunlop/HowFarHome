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
// Además de los carteles, se enseñan unas pocas pistas para que se puedan votar.
const MAX_WEAK_CANDIDATES = 2
// Otros carteles del mismo municipio a esta distancia refuerzan al candidato.
const CORROBORATION_KM = 1

// Hasta dónde es razonable que un cartel nombre un sitio, según su población.
// Un pueblo pequeño solo aparece en los carteles de su comarca; una ciudad, en toda España.
const RANGE_BY_POPULATION = [
  [1_000, 40],
  [5_000, 80],
  [20_000, 150],
  [100_000, 300],
]
const RANGE_BY_PLACE_TYPE = { hamlet: 40, village: 80, town: 150, city: Infinity }
const DEFAULT_RANGE_KM = 150

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

export function plausibleRangeKm({ population, placeType }) {
  if (population) {
    return RANGE_BY_POPULATION.find(([limit]) => population < limit)?.[1] ?? Infinity
  }
  return RANGE_BY_PLACE_TYPE[placeType] ?? DEFAULT_RANGE_KM
}

// Compara el destino completo: "Parque Natural de Cazorla" no es un cartel de Cazorla.
function mentions(destination, names) {
  return destination.split(/[;,|]/).some((part) => names.has(normalizeName(part)))
}

// "Carretera de A-401 a Peal de Becerro" lleva a Peal: su otro extremo suele tener cartel.
// El nombre debe acabar ahí: "de Sevilla La Nueva" no lleva a Sevilla.
const ROAD_NAME_END = /^(\s*$|\s+(a|por|hacia|y)\s|\s*[-–,(/])/
const ROAD_JOINTS = { ' a ': 'to', ' hacia ': 'to', ' de ': 'from' }

// Devuelve 'to' si la carretera va hacia el municipio, 'from' si sale de él, o null.
function roadDirection(roadName, names) {
  const road = ` ${normalizeName(roadName)} `
  for (const [joint, direction] of Object.entries(ROAD_JOINTS)) {
    for (const name of names) {
      let at = road.indexOf(`${joint}${name}`)
      while (at !== -1) {
        if (ROAD_NAME_END.test(road.slice(at + joint.length + name.length))) return direction
        at = road.indexOf(`${joint}${name}`, at + 1)
      }
    }
  }
  return null
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

function levenshtein(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

// Números y referencias de carretera ("25", "A-401", "JA-5106") se cuelan entre las
// palabras del nombre: "PEAL | 25 | DE | BECERRO".
const OCR_NOISE = /^[a-z]{0,3}-?\d+$/

// "P.N. Sierras de Cazorla" nombra un parque, no un destino: la palabra que sigue a "sierra"
// (también mal leída, "Slerras", o pegada, "P.N.Sierras") no cuenta.
const MOUNTAIN_RANGE = /s.?erras?$/

function ocrWords(text) {
  const words = normalizeName(text)
    .split(/[\s|]+/)
    .filter((word) => word && !OCR_NOISE.test(word))
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
  return words.filter((word, index) => {
    const before = words[index - 1] === 'de' ? words[index - 2] : words[index - 1]
    return !(before && MOUNTAIN_RANGE.test(before))
  })
}

// Paneles de obras y subvenciones: citan pueblos, pero no indican el camino a ninguno.
const INFO_PANEL = /consejeria|union europea|invierte|infraestructura|financia/

function isInfoPanel(text) {
  return INFO_PANEL.test(normalizeName(text))
}

// Por debajo de esta longitud un error de OCR convierte palabras corrientes en pueblos:
// "centro" en "Cenero", "turismo" en "Turiso".
const MIN_FUZZY_NAME_LENGTH = 8

// ¿Aparece el nombre en el texto leído? En los nombres largos se admite un error de OCR
// por cada cinco letras; los cortos tienen que leerse exactos.
export function textMentions(text, name) {
  const target = normalizeName(name).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).join(' ')
  const words = ocrWords(text)
  const size = target.split(' ').length
  const tolerance = target.length < MIN_FUZZY_NAME_LENGTH ? 0 : Math.floor(target.length / 5)

  for (let start = 0; start + size <= words.length; start++) {
    if (levenshtein(words.slice(start, start + size).join(' '), target) <= tolerance) return true
  }
  return false
}

// Carteles fotografiados en Mapillary cuyo texto, leído con OCR, nombra al municipio.
function photoSigns(elements, names) {
  return elements
    .filter((element) => element.type === 'photo' && !isInfoPanel(element.tags.ocr))
    .filter((element) => [...names].some((name) => textMentions(element.tags.ocr, name)))
    .map((element) => ({
      lat: element.lat,
      lng: element.lon,
      heading: null,
      source: 'photo',
      text: element.tags.ocr.split('|').map((line) => line.trim()).filter(Boolean).join(' · '),
      road: null,
      badge: null,
      imageId: element.tags.image,
      osmUrl: null,
    }))
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
      highway: tags.highway ?? null,
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
    if (!NAMED_ROAD_HIGHWAYS.includes(tags.highway)) continue
    const direction = roadDirection(tags.name, names)
    if (!direction) continue

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
          direction,
          highway: tags.highway,
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

// Cuánto se puede fiar uno de cada tipo de indicio. Se ajustará con los votos.
function baseScore(sign) {
  // Se ha leído el nombre en una foto del cartel: es la prueba más directa que tenemos.
  if (sign.source === 'photo') return 4
  // Comprobado a mano: el inicio de una carretera con nombre casi nunca tiene cartel.
  if (sign.source === 'road-name') return 0
  // Una salida de autovía o de carretera principal casi siempre lleva cartel de destino.
  if (/^(motorway|trunk|primary)_link$/.test(sign.highway ?? '')) return 3
  return 2
}

// Pistas que se enseñan para poder votarlas, pero que no compiten con los carteles.
function isWeak(sign) {
  return sign.improbable || sign.source === 'road-name'
}

function confidenceOf(score) {
  if (score >= 3) return 'alta'
  if (score >= 2) return 'media'
  return 'baja'
}

function scoreSigns(signs) {
  return signs.map((sign) => {
    // Solo los carteles de destino se refuerzan entre sí; una pista no se vuelve fiable por vecindad.
    const neighbours =
      sign.source === 'road-name'
        ? 0
        : signs.filter(
            (other) => other !== sign && other.source !== 'road-name' && distanceKm(sign, other) < CORROBORATION_KM,
          ).length
    const score = baseScore(sign) + Math.min(neighbours, 2) - (sign.improbable ? 3 : 0)
    return { ...sign, score, confidence: confidenceOf(score) }
  })
}

// Tamaño del municipio: el de Nominatim o, si falta, el del nodo de OSM más cercano.
function sizeOf(municipality, places, home) {
  const node = places.find((place) => distanceKm(place, home) <= SAME_PLACE_KM)
  return {
    population: municipality.population ?? (Number(node?.population) || null),
    placeType: node?.placeType ?? null,
  }
}

function nearestTo(point, home, others) {
  const fromHome = distanceKm(point, home)
  return others.some((other) => distanceKm(point, other) < fromHome)
}

// Devuelve los carteles que nombran al municipio, del más lejano al más cercano,
// con su puntuación de confianza.
export function extractSigns(elements, municipality) {
  const home = { lat: municipality.lat, lng: municipality.lng }
  const names = new Set(nameVariants(municipality.name).map(normalizeName))

  const places = elements
    .filter((element) => element.tags?.place)
    .map(({ lat, lon, tags }) => ({
      lat,
      lng: lon,
      alias: Boolean(tags.alias),
      population: tags.population,
      placeType: tags.place,
    }))
  const homonyms = places.filter((place) => !place.alias && distanceKm(place, home) > SAME_PLACE_KM)
  // Pueblos cuyo nombre largo se abrevia como el buscado ("La Roda de Andalucía").
  const aliases = places.filter((place) => place.alias && distanceKm(place, home) > SAME_PLACE_KM)
  const rangeKm = plausibleRangeKm(sizeOf(municipality, places, home))

  const seen = new Set()
  const signs = []

  // Las fotos van primero: si coinciden con una etiqueta de OSM en el mismo cruce, se queda la foto.
  const found = [
    ...photoSigns(elements, names),
    ...destinationSigns(elements, names),
    ...namedRoadSigns(elements, names, home),
  ]
  for (const sign of found) {
    if (nearestTo(sign, home, homonyms)) continue

    const distance = distanceKm(sign, home)
    const improbable = distance > rangeKm
    // Un cartel demasiado lejano que queda junto a un pueblo de nombre parecido habla de ese pueblo.
    if (improbable && nearestTo(sign, home, aliases)) continue

    // Los ramales de un mismo cruce cuentan como un solo cartel (unos 100 m).
    const spot = `${sign.lat.toFixed(3)},${sign.lng.toFixed(3)}`
    if (seen.has(spot)) continue
    seen.add(spot)

    signs.push({ ...sign, key: signKey(sign), distanceKm: distance, improbable })
  }

  return scoreSigns(signs).sort((a, b) => b.distanceKm - a.distanceKm)
}

// Los más lejanos, saltando los que están en el mismo cruce que uno ya elegido.
// Primero los carteles; después, unas pocas pistas (dudosos o inicios de carretera)
// para que la gente pueda confirmarlas.
export function pickCandidates(signs) {
  const picked = []
  const pick = (pool, limit) => {
    let added = 0
    for (const sign of pool) {
      if (added === limit) break
      if (picked.some((other) => distanceKm(sign, other) < CANDIDATE_SEPARATION_KM)) continue
      picked.push(sign)
      added++
    }
  }
  pick(signs.filter((sign) => !isWeak(sign)), MAX_CANDIDATES)
  pick(signs.filter(isWeak), MAX_WEAK_CANDIDATES)
  return picked.sort((a, b) => b.distanceKm - a.distanceKm)
}
