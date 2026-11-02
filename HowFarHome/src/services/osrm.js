const BASE_URL = 'https://router.project-osrm.org/route/v1/driving'

export async function findRoute(from, to, { signal } = {}) {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const response = await fetch(`${BASE_URL}/${path}?overview=false`, { signal })
  if (!response.ok) throw new Error(`OSRM respondió ${response.status}`)

  const { routes } = await response.json()
  if (!routes?.length) return null

  return {
    distanceKm: routes[0].distance / 1000,
    durationMinutes: Math.round(routes[0].duration / 60),
  }
}
