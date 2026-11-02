const BASE_URL = 'https://nominatim.openstreetmap.org'

async function request(path, params, signal) {
  const query = new URLSearchParams({ format: 'jsonv2', 'accept-language': 'es', ...params })
  const response = await fetch(`${BASE_URL}/${path}?${query}`, { signal })
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`)
  return response.json()
}

export async function findMunicipality(query, { signal } = {}) {
  const [match] = await request(
    'search',
    { q: query, countrycodes: 'es', featureType: 'settlement', addressdetails: 1, limit: 1 },
    signal,
  )
  if (!match) return null

  return {
    name: match.name,
    region: match.address?.province ?? match.address?.state ?? null,
    lat: Number(match.lat),
    lng: Number(match.lon),
  }
}

export async function describeLocation({ lat, lng }, { signal } = {}) {
  const { address } = await request('reverse', { lat, lon: lng, zoom: 10, addressdetails: 1 }, signal)
  if (!address) return null

  return {
    place: address.city ?? address.town ?? address.village ?? address.municipality ?? null,
    region: address.province ?? address.state ?? null,
  }
}
