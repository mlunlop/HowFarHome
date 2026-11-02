// Busca fotos de Mapillary junto al cartel, recorta los carteles de información que
// Mapillary detecta y les pasa OCR para ver si el nombre del municipio aparece escrito.
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { createWorker } from 'tesseract.js'
import { movePoint } from './geo.js'
import { normalizeName } from './signs.js'

const TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN
const GRAPH_URL = 'https://graph.mapillary.com'
const SEARCH_RADIUS_M = 50
const LOOK_BACK_KM = 0.08
const MAX_IMAGES = 4
const MAX_CROPS_PER_IMAGE = 3
const CROP_PADDING = 0.08
const MIN_CROP_WIDTH = 240
const CACHE_PREFIX = 'howfarhome:photo:v1:'

export const photoCheckAvailable = Boolean(TOKEN)

let workerPromise
function ocrWorker() {
  workerPromise ??= createWorker('spa')
  return workerPromise
}

async function graph(path, params, signal) {
  const query = new URLSearchParams({ access_token: TOKEN, ...params })
  const response = await fetch(`${GRAPH_URL}/${path}?${query}`, { signal })
  if (!response.ok) throw new Error(`Mapillary respondió ${response.status}`)
  return (await response.json()).data ?? []
}

async function nearbyImages(sign, signal) {
  const points = sign.heading === null
    ? [sign]
    : [movePoint(sign, (sign.heading + 180) % 360, LOOK_BACK_KM), sign]
  const images = new Map()

  for (const point of points) {
    const found = await graph(
      'images',
      {
        lat: point.lat,
        lng: point.lng,
        radius: SEARCH_RADIUS_M,
        limit: MAX_IMAGES,
        fields: 'id,thumb_2048_url,captured_at',
      },
      signal,
    )
    for (const image of found) images.set(image.id, image)
  }
  return [...images.values()].slice(0, MAX_IMAGES)
}

// La geometría de cada detección es un vector tile en base64 con coordenadas de 0 a extent.
function detectionBox(geometry) {
  const bytes = Uint8Array.from(atob(geometry), (char) => char.charCodeAt(0))
  const tile = new VectorTile(new PbfReader(bytes))
  const layer = Object.values(tile.layers)[0]
  if (!layer?.length) return null

  const points = layer.feature(0).loadGeometry().flat()
  const xs = points.map((p) => p.x / layer.extent)
  const ys = points.map((p) => p.y / layer.extent)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la foto de Mapillary'))
    image.src = url
  })
}

// Recorte ampliado y en escala de grises, que es lo que mejor lee Tesseract.
function cropSign(image, box) {
  const left = Math.max(0, box.left - CROP_PADDING) * image.width
  const top = Math.max(0, box.top - CROP_PADDING) * image.height
  const width = (Math.min(1, box.right + CROP_PADDING) * image.width) - left
  const height = (Math.min(1, box.bottom + CROP_PADDING) * image.height) - top
  const scale = Math.max(1, MIN_CROP_WIDTH / width) * 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  context.filter = 'grayscale(1) contrast(1.4)'
  context.drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height)
  return canvas
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

// El OCR confunde letras sueltas: se admite un error por cada cinco caracteres.
export function textMentions(text, name) {
  const target = normalizeName(name).replace(/[^a-z0-9 ]/g, '')
  const words = normalizeName(text).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean)
  const size = target.split(' ').length
  const tolerance = Math.max(1, Math.floor(target.length / 5))

  for (let start = 0; start + size <= words.length; start++) {
    if (levenshtein(words.slice(start, start + size).join(' '), target) <= tolerance) return true
  }
  return false
}

function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + key))
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // El recorte puede no caber; se repetirá la comprobación la próxima vez.
  }
}

// Resultado: { status: 'match' | 'no-match' | 'no-photos', crop?, text?, imageId? }
export async function checkSignInPhotos(sign, municipality, { signal } = {}) {
  const cacheKey = `${normalizeName(municipality)}|${sign.key}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  const images = await nearbyImages(sign, signal)
  let result = { status: images.length ? 'no-match' : 'no-photos' }

  search: for (const image of images) {
    const detections = await graph(`${image.id}/detections`, { fields: 'value,geometry' }, signal)
    const signs = detections.filter(({ value }) => value.startsWith('information--')).slice(0, MAX_CROPS_PER_IMAGE)
    if (!signs.length) continue

    const photo = await loadImage(image.thumb_2048_url)
    for (const detection of signs) {
      const box = detectionBox(detection.geometry)
      if (!box) continue

      const crop = cropSign(photo, box)
      const { data } = await (await ocrWorker()).recognize(crop)
      signal?.throwIfAborted()

      if (textMentions(data.text, municipality)) {
        result = {
          status: 'match',
          text: data.text.replace(/\s+/g, ' ').trim(),
          crop: crop.toDataURL('image/jpeg', 0.7),
          imageId: image.id,
        }
        break search
      }
    }
  }

  writeCache(cacheKey, result)
  return result
}
