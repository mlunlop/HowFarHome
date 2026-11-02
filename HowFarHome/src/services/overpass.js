import { DESTINATION_KEYS, nameVariants } from './signs.js'

// El servidor principal rechaza peticiones al instante a ratos y al reintentar suele responder.
// El de reserva puede tardar más de dos minutos, así que se deja para el final.
const HOSTS = ['https://overpass-api.de', 'https://overpass-api.de', 'https://overpass.private.coffee']
const RETRY_DELAY_MS = 2000
const QUERY_TIMEOUT_S = 120
// España con Canarias. Es algo más rápido que filtrar por el área del país.
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

// Regex que encuentra el nombre con o sin tildes. signs.js filtra después la coincidencia exacta.
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
  const homonyms = variants.map(
    (variant) => `node["place"~"^(city|town|village|hamlet)$"]["name"="${escapeString(variant)}"];`,
  )

  return `[out:json][timeout:${QUERY_TIMEOUT_S}][bbox:${SEARCH_BBOX}];(
    ${clauses.join('\n    ')}
    node["destination"~"${pattern}",i];
    ${homonyms.join('\n    ')}
  );out tags geom;`
}

export async function fetchSignElements(name, { signal } = {}) {
  const body = new URLSearchParams({ data: buildQuery(name) })
  let lastError

  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}/api/interpreter`, {
        method: 'POST',
        body,
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout((QUERY_TIMEOUT_S + 10) * 1000),
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

  throw lastError
}
