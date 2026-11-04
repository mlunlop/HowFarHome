//Aportaciones de usuarios sin cuenta: carteles que faltan y correcciones de posición
import { distanceKm } from './geo.js'
import { signKey } from './signs.js'
import { clientId, isShared, readJson, supabase, writeJson } from './supabase.js'

const TABLE = 'sign_reports'
const LOCAL_REPORTS = 'howfarhome:reports'
export const MAX_NOTE_LENGTH = 120
//Una corrección acerca el cartel a su sitio real; más lejos sería otro cartel
export const MAX_MOVE_KM = 2
const SAME_SIGN_KM = 0.05

export async function fetchReports(municipalityKey, { signal } = {}) {
  if (!isShared) return readJson(LOCAL_REPORTS)[municipalityKey] ?? []

  const query = new URLSearchParams({
    select: 'kind,sign_key,lat,lng,note,created_at',
    municipality_key: `eq.${municipalityKey}`,
    order: 'created_at.asc',
  })
  return (await supabase(`${TABLE}?${query}`, { signal })).json()
}

export async function submitReport(municipalityKey, { kind, signKey: key = null, lat, lng, note = null }) {
  const report = {
    kind,
    municipality_key: municipalityKey,
    sign_key: key,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    note: note?.trim().slice(0, MAX_NOTE_LENGTH) || null,
  }

  if (isShared) {
    await supabase(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...report, client_id: clientId() }),
    })
  } else {
    const local = readJson(LOCAL_REPORTS)
    local[municipalityKey] = [...(local[municipalityKey] ?? []), report]
    writeJson(LOCAL_REPORTS, local)
  }
  return { ...report, created_at: new Date().toISOString() }
}

//La mediana aguanta mejor que la media a una corrección malintencionada
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

//Suma los carteles añadidos y coloca cada cartel donde lo sitúan las correcciones
export function applyReports(candidates, reports, home) {
  const moves = new Map()
  for (const report of reports.filter((r) => r.kind === 'move')) {
    moves.set(report.sign_key, [...(moves.get(report.sign_key) ?? []), report])
  }

  const withMoves = (sign) => {
    const fixes = moves.get(sign.key)
    if (!fixes) return sign
    const point = { lat: median(fixes.map((f) => f.lat)), lng: median(fixes.map((f) => f.lng)) }
    return { ...sign, ...point, corrections: fixes.length, distanceKm: distanceKm(point, home) }
  }

  const added = []
  for (const sign of reports
    .filter((report) => report.kind === 'add')
    .map((report) => ({
      key: signKey(report),
      lat: report.lat,
      lng: report.lng,
      heading: null,
      source: 'user',
      text: report.note ?? 'Añadido por un usuario',
      road: null,
      badge: null,
      osmUrl: null,
      distanceKm: distanceKm(report, home),
    }))) {
    //Un cartel añadido encima de otro que ya está en la lista (o añadido antes) es el mismo cartel
    if (![...candidates, ...added].some((other) => distanceKm(sign, other) < SAME_SIGN_KM)) added.push(sign)
  }

  //Las claves no cambian al corregir: los votos siguen asociados al cartel original
  return [...candidates, ...added].map(withMoves).sort((a, b) => b.distanceKm - a.distanceKm)
}

//Clave con la que aparece en la lista un cartel recién añadido: si cayó encima de otro, la de ese
export function addedSignKey(candidates, report) {
  const own = signKey(report)
  if (candidates.some((sign) => sign.key === own)) return own
  return candidates.find((sign) => distanceKm(sign, report) < SAME_SIGN_KM)?.key ?? own
}

export function osmEditUrl({ lat, lng }) {
  return `https://www.openstreetmap.org/edit?editor=id#map=19/${lat.toFixed(6)}/${lng.toFixed(6)}`
}
