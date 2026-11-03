// Índice propio generado con scripts/build_sign_index.py: evita depender de Overpass.
// Cada fichero agrupa las claves que empiezan por las mismas dos letras.
// En photo/ están los carteles leídos con OCR (scripts/scan_mapillary_signs.py),
// indexados por las palabras de su texto.
import { nameVariants, normalizeName } from './signs.js'

const INDEX_URL = `${import.meta.env.BASE_URL}sign-index`
// Debe coincidir con MIN_WORD_LENGTH de scripts/scan_mapillary_signs.py
const MIN_PHOTO_WORD_LENGTH = 4

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
  if (t === 'm') return { type: 'photo', id, tags: tg, lat: g[0][0], lon: g[0][1] }
  if (t === 'n') return { type: 'node', id, tags: tg, lat: g[0][0], lon: g[0][1] }
  return { type: 'way', id, tags: tg, geometry: g.map(([lat, lon]) => ({ lat, lon })) }
}

async function lookup(folder, keys, signal) {
  const shards = await Promise.all(
    [...new Set(keys.map(shardOf))].map(async (shard) => [
      shard,
      await fetchJson(`${INDEX_URL}/${folder}${shard}.json`, signal),
    ]),
  )
  const byShard = Object.fromEntries(shards)
  return keys.flatMap((key) => byShard[shardOf(key)]?.[key] ?? [])
}

// Carteles leídos que contienen alguna palabra significativa del nombre. Si el nombre
// completo aparece de verdad lo decide extractSigns(); aquí solo se acota la descarga.
function photoKeys(keys) {
  const words = keys.flatMap((key) => key.replace(/[^a-z0-9 ]/g, ' ').split(' '))
  return [...new Set(words.filter((word) => word.length >= MIN_PHOTO_WORD_LENGTH))]
}

// Devuelve los elementos que mencionan el nombre, o null si no hay índice.
export async function fetchIndexedElements(name, { signal } = {}) {
  if (!(await indexMeta({ signal }))) return null

  const keys = nameVariants(name).map(normalizeName)
  const [osmEntries, photoEntries] = await Promise.all([
    lookup('', keys, signal),
    lookup('photo/', photoKeys(keys), signal),
  ])

  const elements = new Map()
  for (const entry of [...osmEntries, ...photoEntries]) {
    // Un mismo pueblo puede llegar con su nombre exacto y como forma abreviada de otro.
    const id = `${entry.tg.alias ? 'a' : entry.tg.place ? 'p' : entry.t}${entry.id}`
    elements.set(id, toElement(entry))
  }
  return [...elements.values()]
}
