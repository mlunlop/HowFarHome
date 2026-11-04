const EARTH_RADIUS_KM = 6371

const toRadians = (degrees) => (degrees * Math.PI) / 180
const toDegrees = (radians) => (radians * 180) / Math.PI

export function distanceKm(from, to) {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function bearingDegrees(from, to) {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const dLng = toRadians(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return Math.round(toDegrees(Math.atan2(y, x)) + 360) % 360
}

//Punto a cierta distancia de otro siguiendo un rumbo
export function movePoint(point, headingDegrees, km) {
  const angular = km / EARTH_RADIUS_KM
  const heading = toRadians(headingDegrees)
  const lat1 = toRadians(point.lat)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(heading),
  )
  const lng2 =
    toRadians(point.lng) +
    Math.atan2(
      Math.sin(heading) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: toDegrees(lat2), lng: toDegrees(lng2) }
}

export function formatKm(km) {
  return km.toLocaleString('es-ES', { maximumFractionDigits: km < 10 ? 1 : 0 })
}
