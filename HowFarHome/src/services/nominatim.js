import { distanceKm } from './geo.js'
import { normalizeName } from './signs.js'

const BASE_URL = 'https://nominatim.openstreetmap.org'
//La política de uso de Nominatim pide como máximo una petición por segundo
const MIN_INTERVAL_MS = 1000
const MAX_PLACES = 10
//Resultados con el mismo nombre a menos de esto son el mismo sitio (nodo y término municipal)
const SAME_PLACE_KM = 5
//El centro de un municipio grande puede quedar lejos del núcleo (Zaragoza: 5 km)
//así que un núcleo homónimo cercano cuenta como el mismo sitio
const SAME_MUNICIPALITY_KM = 15
//Nombres que pueden aparecer en los carteles: el local y los de las lenguas cooficiales
const SIGN_NAME_KEYS = ['name', 'name:es', 'name:ca', 'name:eu', 'name:gl', 'name:oc', 'official_name']

const KIND_LABELS = {
  city: 'Ciudad',
  town: 'Pueblo',
  village: 'Pueblo',
  municipality: 'Municipio',
  hamlet: 'Aldea',
  city_district: 'Barrio',
  isolated_dwelling: 'Aldea',
  suburb: 'Barrio',
  neighbourhood: 'Barrio',
  quarter: 'Barrio',
}

let lastRequest = 0

async function request(path, params, signal) {
  const waitMs = lastRequest + MIN_INTERVAL_MS - Date.now()
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
  lastRequest = Date.now()

  const query = new URLSearchParams({ format: 'jsonv2', 'accept-language': 'es', ...params })
  const response = await fetch(`${BASE_URL}/${path}?${query}`, { signal })
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`)
  return response.json()
}

//En España los municipios son admin_level 8, que Nominatim traduce a place_rank 16
//Las parroquias de Asturias o Galicia también son límites administrativos, pero de rango menor
const MUNICIPALITY_RANK = 16

//Según la zona, Nominatim guarda la provincia en province, state_district o county
function provinceOf(address) {
  return address.province ?? address.state_district ?? address.county ?? address.state ?? null
}

//Provincias, comunidades y comarcas también son límites administrativos, pero no pueblos
function isSettlement(match) {
  return match.category !== 'boundary' || match.place_rank >= MUNICIPALITY_RANK
}

//Otros nombres del sitio: Nominatim responde «Lérida», pero los carteles dicen «Lleida»
function aliasesOf(match) {
  const details = match.namedetails ?? {}
  const seen = new Set([normalizeName(match.name)])
  const aliases = []
  for (const key of SIGN_NAME_KEYS) {
    for (const name of (details[key] ?? '').split(/[/;]/).map((part) => part.trim())) {
      if (!name || seen.has(normalizeName(name))) continue
      seen.add(normalizeName(name))
      aliases.push(name)
    }
  }
  return aliases
}

function toPlace(match) {
  const address = match.address ?? {}
  const region = provinceOf(address)
  const parent = address.municipality ?? address.city ?? address.town ?? address.village ?? null
  return {
    name: match.name,
    aliases: aliasesOf(match),
    region,
    //Para aldeas, el municipio al que pertenecen ayuda a distinguirlas
    detail: parent && parent !== match.name ? parent : null,
    kind:
      match.category === 'boundary' && match.place_rank === MUNICIPALITY_RANK
        ? 'Municipio'
        : KIND_LABELS[match.addresstype] ?? null,
    population: Number(match.extratags?.population) || null,
    lat: Number(match.lat),
    lng: Number(match.lon),
  }
}

//Todos los sitios de España que encajan con el texto, municipios primero
export async function searchPlaces(text, { signal, limit = MAX_PLACES } = {}) {
  const matches = await request(
    'search',
    { q: text, countrycodes: 'es', featureType: 'settlement', addressdetails: 1, extratags: 1, namedetails: 1, limit },
    signal,
  )

  //Municipios primero: así el núcleo homónimo se descarta frente a su municipio y no al revés
  const found = matches
    .filter(isSettlement)
    .map(toPlace)
    .sort((a, b) => (b.kind === 'Municipio') - (a.kind === 'Municipio'))

  const places = []
  for (const place of found) {
    const duplicate = places.some((other) => {
      const sameKm = other.kind === 'Municipio' && place.kind !== 'Municipio' ? SAME_MUNICIPALITY_KM : SAME_PLACE_KM
      return normalizeName(other.name) === normalizeName(place.name) && distanceKm(other, place) < sameKm
    })
    if (!duplicate) places.push(place)
  }
  return places
}

//Un código postal apunta a una zona: buscamos después el pueblo para tener su centro
export async function placesForPostcode(postcode, { signal } = {}) {
  const [match] = await request(
    'search',
    { postalcode: postcode, countrycodes: 'es', addressdetails: 1, limit: 1 },
    signal,
  )
  if (!match) return []

  const address = match.address ?? {}
  const name = address.village ?? address.town ?? address.city ?? address.municipality
  const region = provinceOf(address)
  if (!name) return []

  const [place] = await searchPlaces(region ? `${name}, ${region}` : name, { signal, limit: 1 })
  return [place ?? { name, region, detail: null, kind: null, lat: Number(match.lat), lng: Number(match.lon) }]
}

export async function describeLocation({ lat, lng }, { signal } = {}) {
  const { address } = await request('reverse', { lat, lon: lng, zoom: 10, addressdetails: 1 }, signal)
  if (!address) return null

  return {
    place: address.city ?? address.town ?? address.village ?? address.municipality ?? null,
    region: provinceOf(address),
  }
}
