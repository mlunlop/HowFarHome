// Índice propio generado con scripts/build_sign_index.py: evita depender de Overpass.
// Cada fichero agrupa las claves que empiezan por las mismas dos letras.
import { nameVariants, normalizeName } from './signs.js'

const INDEX_URL = `${import.meta.env.BASE_URL}sign-index`

function shardOf(key) {
  return key.slice(0, 2).replace(/[^a-z0-9]/g, '_').padEnd(2, '_')
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Índice respondió ${response.status}`)
  // Vite devuelve index.html para rutas inexistentes en desarrollo.
  if (!response.headers.get('content-type')?.includes('json')) return null
  return response.json()
}

let metaPromise
export function indexMeta({ signal } = {}) {
  metaPromise ??= fetchJson(`${INDEX_URL}/meta.json`, signal).catch(() => null)
  return metaPromise
}

// Convierte las entradas compactas al formato de Overpass que entiende extractSigns().
function toElement({ t, id, tg, g }) {
  if (t === 'n') return { type: 'node', id, tags: tg, lat: g[0][0], lon: g[0][1] }
  return { type: 'way', id, tags: tg, geometry: g.map(([lat, lon]) => ({ lat, lon })) }
}

// Devuelve los elementos de OSM que mencionan el nombre, o null si no hay índice.
export async function fetchIndexedElements(name, { signal } = {}) {
  if (!(await indexMeta({ signal }))) return null

  const keys = nameVariants(name).map(normalizeName)
  const shards = await Promise.all(
    [...new Set(keys.map(shardOf))].map(async (shard) => [
      shard,
      await fetchJson(`${INDEX_URL}/${shard}.json`, signal),
    ]),
  )
  const byShard = Object.fromEntries(shards)

  const elements = new Map()
  for (const key of keys) {
    for (const entry of byShard[shardOf(key)]?.[key] ?? []) {
      const element = toElement(entry)
      const id = `${entry.tg.place ? 'p' : entry.t}${entry.id}`
      elements.set(id, element)
    }
  }
  return [...elements.values()]
}
