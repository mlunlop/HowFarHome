//TEMPORAL: opciones de pruebas para comparar fuentes, solo en desarrollo
const STORAGE_KEY = 'howfarhome:debug'

export const SOURCE_MODES = {
  all: 'OSM + fotos',
  osm: 'Solo OSM',
  photo: 'Solo fotos',
}

const DEFAULTS = { sources: 'all', shared: true }

export function debugOptions() {
  if (!import.meta.env.DEV) return DEFAULTS
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return DEFAULTS
  }
}

export function setDebugOptions(options) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    //Sin almacenamiento las opciones duran lo que la pestaña
  }
}

//Los nodos de pueblo se quedan siempre: sirven para descartar homónimos
export function filterBySource(elements, sources) {
  if (sources === 'osm') return elements.filter((element) => element.type !== 'photo')
  if (sources === 'photo') return elements.filter((element) => element.type === 'photo' || element.tags?.place)
  return elements
}
