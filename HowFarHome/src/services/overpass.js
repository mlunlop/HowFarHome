import { DESTINATION_KEYS, NAMED_ROAD_HIGHWAYS, nameVariants } from './signs.js'

//El servidor principal rechaza peticiones al instante a ratos y al reintentar suele responder
//El de reserva puede tardar más de dos minutos, así que se deja para el final
const HOSTS = ['https://overpass-api.de', 'https://overpass-api.de', 'https://overpass.private.coffee']
const RETRY_DELAY_MS = 2000
const QUERY_TIMEOUT_S = 120
//Tope para toda la búsqueda: si los servidores están saturados, mejor avisar que esperar minutos
const TOTAL_BUDGET_MS = 150_000
const MIN_ATTEMPT_MS = 15_000
//España con Canarias, algo más rápido que filtrar por el área del país
const SEARCH_BBOX = '27.5,-18.5,44,4.6'

const ACCENT_CLASSES = {
  a: '[aáàAÁÀ]',
  e: '[eéèEÉÈ]',
  i: '[iíïIÍÏ]',
  o: '[oóòOÓÒ]',
  u: '[uúüUÚÜ]',
  n: '[nñNÑ]',
  c: '[cçCÇ]',
}

//Encuentra el nombre con o sin tildes, signs.js filtra luego la coincidencia exacta
function accentInsensitivePattern(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[a-z]/gi, (char) => ACCENT_CLASSES[char.toLowerCase()] ?? char)
}

function escapeString(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildQuery(name) {
  const variants = nameVariants(name)
  const pattern = escapeString(variants.map(accentInsensitivePattern).join('|'))
  const clauses = DESTINATION_KEYS.map((key) => `way["${key}"~"${pattern}",i];`)
  const roadName = `^(Carretera|Ctra).* (de|a|hacia) (${pattern})( |$)`
  const homonyms = variants.map(
    (variant) => `node["place"~"^(city|town|village|hamlet)$"]["name"="${escapeString(variant)}"];`,
  )

  return `[out:json][timeout:${QUERY_TIMEOUT_S}][bbox:${SEARCH_BBOX}];(
    ${clauses.join('\n    ')}
    node["destination"~"${pattern}",i];
    way["highway"~"^(${NAMED_ROAD_HIGHWAYS.join('|')})$"]["name"~"${roadName}",i];
    ${homonyms.join('\n    ')}
  );out tags geom;`
}

export async function fetchSignElements(name, { signal } = {}) {
  const body = new URLSearchParams({ data: buildQuery(name) })
  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastError

  for (const host of HOSTS) {
    const remaining = deadline - Date.now()
    if (remaining < MIN_ATTEMPT_MS) break

    try {
      const response = await fetch(`${host}/api/interpreter`, {
        method: 'POST',
        body,
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout(Math.min((QUERY_TIMEOUT_S + 10) * 1000, remaining)),
        ]),
      })
      if (!response.ok) throw new Error(`Overpass respondió ${response.status}`)

      const { elements, remark } = await response.json()
      if (remark?.includes('runtime error')) throw new Error(remark)
      return elements
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }

  throw lastError ?? new Error('Overpass no respondió a tiempo')
}
