// Acceso a Supabase compartido por votos y aportaciones. Sin configurarlo,
// todo se guarda solo en este navegador para poder probar la app.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
const CLIENT_ID = 'howfarhome:client-id'

export const isShared = Boolean(SUPABASE_URL && SUPABASE_KEY)

export function readJson(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento el dato se pierde al recargar, pero la app sigue funcionando.
  }
}

// Error de Supabase con un mensaje para la persona cuando es por exceso de aportaciones.
export class SupabaseError extends Error {
  constructor(status, body) {
    super(`Supabase respondió ${status}`)
    this.code = body?.code ?? null
    this.rateLimited = this.code === 'P0001'
  }
}

export async function supabase(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new SupabaseError(response.status, await response.json().catch(() => null))
  return response
}

// Identificador anónimo de este navegador para los topes de aportaciones.
export function clientId() {
  let id = readJson(CLIENT_ID, null)
  if (!id) {
    id = crypto.randomUUID()
    writeJson(CLIENT_ID, id)
  }
  return id
}
