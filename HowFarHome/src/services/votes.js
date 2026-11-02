// Votos «sí hay cartel / no hay cartel». Se comparten en Supabase; sin configurarlo,
// se guardan solo en este navegador para poder probar la app.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
const TABLE = 'sign_votes'
const LOCAL_VOTES = 'howfarhome:votes'
const MY_VOTES = 'howfarhome:my-votes'

export const votesAreShared = Boolean(SUPABASE_URL && SUPABASE_KEY)

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? {}
  } catch {
    return {}
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento el voto se pierde al recargar, pero la app sigue funcionando.
  }
}

function supabase(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...init.headers },
  })
}

// Recuento por cartel: { [signKey]: { yes, no } }
export async function fetchVotes(municipalityKey, { signal } = {}) {
  let rows
  if (votesAreShared) {
    const query = new URLSearchParams({
      select: 'sign_key,vote',
      municipality_key: `eq.${municipalityKey}`,
    })
    const response = await supabase(`${TABLE}?${query}`, { signal })
    if (!response.ok) throw new Error(`Supabase respondió ${response.status}`)
    rows = await response.json()
  } else {
    rows = readJson(LOCAL_VOTES)[municipalityKey] ?? []
  }

  const tally = {}
  for (const { sign_key: key, vote } of rows) {
    tally[key] ??= { yes: 0, no: 0 }
    tally[key][vote > 0 ? 'yes' : 'no']++
  }
  return tally
}

export function myVote(municipalityKey, key) {
  return readJson(MY_VOTES)[`${municipalityKey}|${key}`] ?? null
}

export async function castVote(municipalityKey, key, vote) {
  const row = { municipality_key: municipalityKey, sign_key: key, vote }

  if (votesAreShared) {
    const response = await supabase(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
    if (!response.ok) throw new Error(`Supabase respondió ${response.status}`)
  } else {
    const local = readJson(LOCAL_VOTES)
    local[municipalityKey] = [...(local[municipalityKey] ?? []), row]
    writeJson(LOCAL_VOTES, local)
  }

  writeJson(MY_VOTES, { ...readJson(MY_VOTES), [`${municipalityKey}|${key}`]: vote })
}

export function verdict(tally) {
  if (!tally) return 'unverified'
  if (tally.no > tally.yes) return 'rejected'
  if (tally.yes > tally.no) return 'confirmed'
  return 'unverified'
}
