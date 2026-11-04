//Del texto que escribe la persona a un sitio concreto con coordenadas
import { placesForPostcode, searchPlaces } from './nominatim.js'

const CARTOCIUDAD_URL = 'https://www.cartociudad.es/geocoder/api/geocoder/candidates'
const SUGGESTION_TYPES = new Set(['Municipio', 'poblacion'])
const MAX_SUGGESTIONS = 6
const POSTCODE = /^\d{5}$/

export function isPostcode(text) {
  return POSTCODE.test(text.trim())
}

//Sugerencias al escribir con CartoCiudad (IGN), Nominatim no permite autocompletar
export async function suggestPlaces(text, { signal } = {}) {
  const query = new URLSearchParams({ q: text, limit: 15 })
  const response = await fetch(`${CARTOCIUDAD_URL}?${query}`, { signal })
  if (!response.ok) return []

  const seen = new Set()
  const suggestions = []
  for (const candidate of await response.json()) {
    if (!SUGGESTION_TYPES.has(candidate.type)) continue

    const isMunicipality = candidate.type === 'Municipio'
    const name = isMunicipality ? candidate.muni : (candidate.poblacion ?? candidate.address.split(',')[0])
    const parent = !isMunicipality && candidate.muni !== name ? candidate.muni : null
    const id = `${name}|${parent}|${candidate.province}`
    if (!name) continue
    //CartoCiudad devuelve a veces el mismo pueblo como núcleo y como municipio
    if (seen.has(id)) {
      if (isMunicipality) suggestions.find((s) => s.id === id).kind = 'Municipio'
      continue
    }
    seen.add(id)

    suggestions.push({
      id,
      name,
      region: candidate.province,
      detail: parent,
      kind: isMunicipality ? 'Municipio' : 'Núcleo',
      //Texto con el que Nominatim encuentra exactamente este sitio
      query: [name, parent, candidate.province].filter(Boolean).join(', '),
    })
  }
  return suggestions.slice(0, MAX_SUGGESTIONS)
}

//Devuelve los sitios posibles: uno si no hay duda, varios si hay que elegir
export async function resolvePlaces(input, { signal } = {}) {
  if (typeof input === 'object') {
    const [place] = await searchPlaces(input.query, { signal, limit: 1 })
    return place ? [{ ...place, region: place.region ?? input.region }] : []
  }
  if (isPostcode(input)) return placesForPostcode(input.trim(), { signal })
  return searchPlaces(input, { signal })
}
